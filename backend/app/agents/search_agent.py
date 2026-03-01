"""Agent 3 — Search Agent

Hybrid search: keyword/tag search against Postgres AND cosine-similarity
search against pgvector embeddings, merged and re-ranked.

The agent layer interprets natural language before hitting the DB:
  "that ASCII animation site I saw"
  → { keywords: ["ascii", "animation"], content_type_filter: "link", ... }
  → keyword search + vector similarity → merged ranked results

Entry points:
  semantic_search(query, user_id)  — text query
  voice_search(audio_bytes, user_id, filename) — transcribes then searches
"""

import asyncio
import logging

from app.config import settings
from app.models.schemas import NoteResponse
from app.services.ai_client import ai_client
from app.services.embeddings import generate_embedding
from app.services.supabase import supabase
from app.services.transcription import transcribe_audio
from app.utils import parse_llm_json

log = logging.getLogger(__name__)

_INTERPRET_SYSTEM_PROMPT = """\
You are a search query interpreter for a personal note-taking app.
Convert the user's natural language query into structured search parameters.
Respond with a single JSON object only — no explanation.

Required keys:
{
  "keywords":            ["keyword1", "keyword2"],
  "tags":                ["tag1"],
  "content_type_filter": "text" | "voice" | "image" | "link" | null,
  "semantic_query":      "clean rephrased query for vector similarity search"
}

Rules:
- keywords: 1-4 individual words most likely to appear in the note text
- tags: only include if the query clearly implies a tag (e.g. "my python notes" → ["python"])
- content_type_filter: null unless the user clearly refers to a specific type
- semantic_query: the most meaningful rephrasing of the intent
"""

# Weights for result merging
_KEYWORD_SCORE = 0.65
_VECTOR_BONUS = 0.15   # extra credit when a note appears in both result sets


async def semantic_search(
    query: str,
    user_id: str,
    mode: str = "hybrid",
) -> list[NoteResponse]:
    """Run a hybrid search over the user's notes.

    Args:
        query:   Natural-language search string.
        user_id: Authenticated user UUID (scopes all DB queries).
        mode:    "hybrid" | "semantic" | "keyword"

    Returns:
        List of NoteResponse objects ordered by relevance.
    """
    # ── 1. Interpret the query ─────────────────────────────────────────────
    structured = await _interpret_query(query)

    # ── 2. Keyword search ─────────────────────────────────────────────────
    keyword_ids: dict[str, float] = {}
    if mode in ("hybrid", "keyword"):
        rows = await _keyword_search(structured, user_id)
        for row in rows:
            keyword_ids[str(row["id"])] = _KEYWORD_SCORE

    # ── 3. Vector similarity search ───────────────────────────────────────
    vector_rows: list[dict] = []
    if mode in ("hybrid", "semantic"):
        try:
            embedding = await generate_embedding(structured["semantic_query"])
            vector_rows = await _vector_search(embedding, user_id)
        except Exception as exc:
            log.warning("search_agent: vector search failed: %s", exc)

    # ── 4. Merge scores ────────────────────────────────────────────────────
    scores: dict[str, float] = dict(keyword_ids)
    for row in vector_rows:
        note_id = str(row["id"])
        sim: float = float(row.get("similarity", 0.5))
        if note_id in scores:
            scores[note_id] = max(scores[note_id], sim) + _VECTOR_BONUS
        else:
            scores[note_id] = sim

    if not scores:
        return []

    ranked_ids = sorted(scores, key=lambda k: scores[k], reverse=True)[:20]

    # ── 5. Fetch full note data with joins ────────────────────────────────
    return await _fetch_notes(ranked_ids, user_id, scores)


async def voice_search(
    audio_bytes: bytes,
    user_id: str,
    filename: str = "audio.m4a",
    mode: str = "hybrid",
) -> list[NoteResponse]:
    """Transcribe audio via Whisper then run semantic_search."""
    query = await transcribe_audio(audio_bytes, filename)
    log.info("voice_search: transcribed query=%r", query[:120])
    return await semantic_search(query, user_id, mode=mode)


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _interpret_query(query: str) -> dict:
    """Use Gemini to convert natural language to structured search params."""
    try:
        resp = await ai_client.chat.completions.create(
            model=settings.search_model,
            messages=[
                {"role": "system", "content": _INTERPRET_SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            temperature=0.1,
            max_tokens=200,
        )
        return parse_llm_json(resp.choices[0].message.content)
    except Exception as exc:
        log.warning("search_agent: query interpretation failed: %s", exc)
        # Safe fallback: treat query as-is
        return {
            "keywords": query.split()[:4],
            "tags": [],
            "content_type_filter": None,
            "semantic_query": query,
        }


async def _keyword_search(structured: dict, user_id: str) -> list[dict]:
    """Keyword search against raw_content using individual keyword OR matching."""
    keywords = [kw.strip() for kw in structured.get("keywords", []) if kw.strip()]
    if not keywords:
        return []

    try:
        or_filter = ", ".join(f"raw_content.ilike.%{kw}%" for kw in keywords)
        q = (
            supabase.table("notes")
            .select("id, raw_content, processed_content, content_type, category_id, tags, source_url, file_path, created_at")
            .eq("user_id", user_id)
            .or_(or_filter)
        )
        if structured.get("content_type_filter"):
            q = q.eq("content_type", structured["content_type_filter"])

        result = await asyncio.to_thread(lambda: q.limit(15).execute())
        return result.data or []
    except Exception as exc:
        log.warning("search_agent: keyword search failed: %s", exc)
        return []


async def _vector_search(
    embedding: list[float],
    user_id: str,
    threshold: float = 0.45,
    limit: int = 15,
) -> list[dict]:
    """Cosine-similarity search via the match_notes pgvector RPC."""
    try:
        result = await asyncio.to_thread(
            lambda: supabase.rpc(
                "match_notes",
                {
                    "query_embedding": embedding,
                    "match_threshold": threshold,
                    "match_count": limit,
                    "p_user_id": user_id,
                },
            ).execute()
        )
        return result.data or []
    except Exception as exc:
        log.warning("search_agent: vector search failed: %s", exc)
        return []


async def _fetch_notes(
    note_ids: list[str], user_id: str, scores: dict[str, float]
) -> list[NoteResponse]:
    """Fetch full note rows (with joins) for the given IDs and map to NoteResponse."""
    from app.routers.notes import NOTE_SELECT, _row_to_note  # avoid circular at module load

    if not note_ids:
        return []

    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("notes")
            .select(NOTE_SELECT)
            .in_("id", note_ids)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        log.warning("search_agent: fetch_notes failed: %s", exc)
        return []

    rows = result.data or []
    # Re-apply the score ordering
    rows.sort(key=lambda r: scores.get(str(r["id"]), 0), reverse=True)
    return [_row_to_note(r) for r in rows]
