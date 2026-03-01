"""Agent 1 — Organizer

Runs every time a note is created (via the Celery pipeline) and on a weekly
re-org pass.  Given the new note and the user's existing categories + recent
notes, it:

  1. Generates a clean title and 2-3 sentence summary
  2. Extracts 3-7 tags
  3. Assigns the note to the best-matching existing category, or creates a new one
  4. Surfaces up to 3 related notes already in the system
  5. Optionally suggests category merges when duplicates are detected

All LLM calls go through the Gemini OpenAI-compatible API.
"""

import asyncio
import json
import logging

from app.config import settings
from app.services.ai_client import ai_client
from app.services.supabase import supabase
from app.utils import parse_llm_json

log = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a personal knowledge organizer. Given a new note and the user's existing \
knowledge base, respond with a single JSON object — no explanation, no code fences.

Required keys:
{
  "title":               "short descriptive title, max 60 chars",
  "summary":             "2-3 sentence summary of the note",
  "tags":                ["lowercase", "specific", "tags"],
  "category_name":       "exact name of best-fit existing category, or a new name",
  "category_description":"one sentence description if this is a NEW category, else ''",
  "is_new_category":     true or false,
  "related_note_ids":    ["uuid-of-related-note"],
  "merge_suggestions":   [{"from": "OldCat", "into": "BetterCat"}]
}

Rules:
- tags: 3–7 lowercase tags, useful for filtering and search
- category_name: prefer an exact match to an existing name; only create new if nothing fits
- related_note_ids: max 3; only include notes that are clearly topically related
- merge_suggestions: only if two existing categories are obvious duplicates; else []
"""


async def organize_note(note_id: str) -> None:
    """Classify and organize a note using Featherless.ai.

    Fetches the note, builds context from the user's existing categories and
    recent notes, calls the LLM, then writes back title/summary/tags/category
    to Supabase.
    """
    # ── 1. Fetch the note ────────────────────────────────────────────────────
    note_res = await asyncio.to_thread(
        lambda: supabase.table("notes").select("*").eq("id", note_id).single().execute()
    )
    note = note_res.data
    if not note or not (note.get("raw_content") or "").strip():
        log.warning("organize_note: note %s has no content, skipping", note_id)
        return

    user_id: str = note["user_id"]

    # ── 2. Fetch existing categories ─────────────────────────────────────────
    cats_res = await asyncio.to_thread(
        lambda: supabase.table("categories")
        .select("id, name, description, note_count")
        .eq("user_id", user_id)
        .execute()
    )
    categories: list[dict] = cats_res.data or []

    # ── 3. Fetch recent notes for related-note detection ─────────────────────
    notes_res = await asyncio.to_thread(
        lambda: supabase.table("notes")
        .select("id, processed_content, tags")
        .eq("user_id", user_id)
        .neq("id", note_id)
        .order("created_at", desc=True)
        .limit(40)
        .execute()
    )
    existing_notes = [
        {
            "id": n["id"],
            "preview": (n.get("processed_content") or "")[:120],
            "tags": n.get("tags") or [],
        }
        for n in (notes_res.data or [])
    ]

    # ── 4. Build the user prompt ──────────────────────────────────────────────
    user_prompt = (
        f"NEW NOTE\n"
        f"Type: {note['content_type']}\n"
        + (f"Source URL: {note['source_url']}\n" if note.get("source_url") else "")
        + f"Content:\n{note['raw_content'][:3000]}\n\n"
        f"EXISTING CATEGORIES:\n{json.dumps(categories, default=str)}\n\n"
        f"RECENT NOTES (for related-note detection):\n"
        f"{json.dumps(existing_notes, default=str)}"
    )

    # ── 5. Call Gemini ────────────────────────────────────────────────────────
    response = await ai_client.chat.completions.create(
        model=settings.organizer_model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=600,
    )
    result = parse_llm_json(response.choices[0].message.content)

    # ── 6. Upsert category ───────────────────────────────────────────────────
    category_id = await _upsert_category(user_id, result, categories)

    # ── 7. Validate related_note_ids against known existing IDs ──────────────
    existing_ids = {n["id"] for n in existing_notes}
    raw_related = result.get("related_note_ids") or []
    related_note_ids = [r for r in raw_related if r in existing_ids][:3]

    # ── 8. Write back to the note ────────────────────────────────────────────
    update_fields: dict = {
        "processed_content": result.get("summary"),
        "tags": result.get("tags") or [],
        "category_id": category_id,
        "related_note_ids": related_note_ids,
    }
    # Only set title if the note doesn't already have one (e.g. link notes
    # get their title from the link-scraping step and it should be kept).
    if not (note.get("title") or "").strip():
        update_fields["title"] = result.get("title")

    await asyncio.to_thread(
        lambda: supabase.table("notes")
        .update(update_fields)
        .eq("id", note_id)
        .execute()
    )

    log.info(
        "organize_note: note=%s category=%s tags=%s related=%s",
        note_id,
        result.get("category_name"),
        result.get("tags"),
        related_note_ids,
    )


async def _upsert_category(
    user_id: str, result: dict, existing: list[dict]
) -> str | None:
    """Return the ID of the matching or newly created category."""
    name = (result.get("category_name") or "").strip()
    if not name:
        return None

    # Case-insensitive match against existing categories
    for cat in existing:
        if cat["name"].lower() == name.lower():
            return cat["id"]

    # Create new category
    new_res = await asyncio.to_thread(
        lambda: supabase.table("categories")
        .insert(
            {
                "user_id": user_id,
                "name": name,
                "description": result.get("category_description") or "",
                "note_count": 0,
            }
        )
        .execute()
    )
    return new_res.data[0]["id"] if new_res.data else None


async def reorganize_all(user_id: str) -> None:
    """Weekly re-org pass — re-run the organizer over all of a user's notes.

    Called by the Celery beat schedule. Useful when categories have evolved
    since notes were originally filed.
    """
    notes_res = await asyncio.to_thread(
        lambda: supabase.table("notes")
        .select("id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    for row in notes_res.data or []:
        try:
            await organize_note(row["id"])
        except Exception as exc:
            log.error("reorganize_all: failed on note %s: %s", row["id"], exc)
