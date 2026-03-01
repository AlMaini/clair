import asyncio
import logging

from celery import Celery

from app.config import settings

log = logging.getLogger(__name__)

celery_app = Celery("clair", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Weekly re-org beat schedule
    beat_schedule={
        "weekly-reorg": {
            "task": "weekly_reorg",
            "schedule": 60 * 60 * 24 * 7,  # every 7 days
        }
    },
)


@celery_app.task(name="process_note")
def process_note(note_id: str) -> None:
    """Orchestrate the full AI pipeline for a newly created note.

    Steps (each failure is logged and skipped so the pipeline continues):
      1. Transcribe  — if voice note with an attached file, run Whisper and
                       write the transcript back to raw_content
      2. Organize    — classify, tag, summarise, assign/create category
      3. Embed       — generate and store the pgvector embedding
      4. Research    — enqueue the rate-limited researcher task
    """
    from app.services.supabase import supabase

    # Fetch the note once upfront
    note = (
        supabase.table("notes")
        .select("id, user_id, content_type, raw_content, file_path")
        .eq("id", note_id)
        .single()
        .execute()
        .data
    )
    if not note:
        log.error("process_note: note %s not found", note_id)
        return

    # ── 0. Link scraping + summarisation (link notes only) ──────────────────
    if note["content_type"] == "link":
        source_url = (note.get("raw_content") or "").strip()
        if source_url:
            try:
                from app.services.scraper import scrape_url
                from app.services.ai_client import ai_client
                from app.config import settings as _s

                page_text = asyncio.run(scrape_url(source_url))
                if page_text:
                    _LINK_SUMMARISE_PROMPT = (
                        "You are a concise note-taking assistant. Given the raw text "
                        "scraped from a webpage, produce a JSON object with three keys:\n"
                        '  "title": "A short, descriptive title for this note (max 60 chars)",\n'
                        '  "body": "A clear, well-structured summary capturing the key topics, '
                        'ideas, and takeaways. Paraphrase — do NOT copy sentences verbatim. '
                        'Use short paragraphs or bullet points. '
                        'You may use simple HTML tags (<strong>, <em>, <ul>, <li>, <blockquote>) '
                        'for formatting.",\n'
                        '  "tags": ["3-7 lowercase tags relevant to the content"]\n'
                        "Respond with ONLY the JSON object, no code fences or preamble."
                    )
                    resp = asyncio.run(
                        ai_client.chat.completions.create(
                            model=_s.organizer_model,
                            messages=[
                                {"role": "system", "content": _LINK_SUMMARISE_PROMPT},
                                {
                                    "role": "user",
                                    "content": (
                                        f"URL: {source_url}\n\n"
                                        f"PAGE CONTENT:\n{page_text[:6000]}"
                                    ),
                                },
                            ],
                            temperature=0.3,
                            max_tokens=1200,
                        )
                    )
                    from app.utils import parse_llm_json
                    parsed = parse_llm_json(resp.choices[0].message.content)
                    link_title = parsed.get("title", "").strip()
                    link_body = parsed.get("body", "").strip()

                    link_tags = parsed.get("tags") or []
                    # Normalise tags: lowercase, strip whitespace
                    link_tags = [t.strip().lower() for t in link_tags if isinstance(t, str) and t.strip()][:7]

                    update_payload = {"source_url": source_url}
                    if link_body:
                        update_payload["raw_content"] = link_body
                    if link_title:
                        update_payload["title"] = link_title
                    if link_tags:
                        update_payload["tags"] = link_tags
                    supabase.table("notes").update(update_payload).eq("id", note_id).execute()
                    log.info(
                        "process_note: scraped & summarised link note %s (title=%s, %d chars)",
                        note_id, link_title, len(link_body),
                    )
                else:
                    supabase.table("notes").update(
                        {"source_url": source_url}
                    ).eq("id", note_id).execute()
                    log.warning("process_note: scrape returned empty for %s", source_url)
            except Exception as exc:
                log.error("process_note: link scraping failed for %s: %s", note_id, exc)

    # ── 1. Transcription (voice notes only) ──────────────────────────────────
    if note["content_type"] == "voice" and note.get("file_path") and not (note.get("raw_content") or "").strip():
        try:
            from app.services.transcription import transcribe_audio

            file_bytes = supabase.storage.from_("note-files").download(note["file_path"])
            filename = note["file_path"].rsplit("/", 1)[-1]
            transcript = asyncio.run(transcribe_audio(file_bytes, filename))
            supabase.table("notes").update({"raw_content": transcript}).eq("id", note_id).execute()
            log.info("process_note: transcribed note %s (%d chars)", note_id, len(transcript))
        except Exception as exc:
            log.error("process_note: transcription failed for %s: %s", note_id, exc)

    # ── 2. Organize ───────────────────────────────────────────────────────────
    try:
        from app.agents.organizer import organize_note

        asyncio.run(organize_note(note_id))
    except Exception as exc:
        log.error("process_note: organize failed for %s: %s", note_id, exc)

    # ── 3. Embed ──────────────────────────────────────────────────────────────
    try:
        from app.services.embeddings import generate_embedding

        refreshed = (
            supabase.table("notes")
            .select("raw_content, processed_content")
            .eq("id", note_id)
            .single()
            .execute()
            .data
        )
        text_to_embed = (
            refreshed.get("processed_content") or refreshed.get("raw_content") or ""
        ).strip()

        if text_to_embed:
            embedding = asyncio.run(generate_embedding(text_to_embed))
            supabase.table("notes").update({"embedding": embedding}).eq("id", note_id).execute()
            log.info("process_note: embedded note %s", note_id)
    except Exception as exc:
        log.error("process_note: embedding failed for %s: %s", note_id, exc)

    # ── 4. Research (rate-limited, runs separately) ───────────────────────────
    research_note.apply_async(args=[note_id], countdown=5)


@celery_app.task(name="research_note", rate_limit="10/m")
def research_note(note_id: str) -> None:
    """Rate-limited task: find and attach external resources to a note."""
    from app.agents.researcher import research_note as _research

    asyncio.run(_research(note_id))


@celery_app.task(name="weekly_reorg")
def weekly_reorg() -> None:
    """Re-run the organizer over every user's notes once a week.

    Fetches distinct user IDs from the notes table and calls reorganize_all
    for each one sequentially.
    """
    from app.services.supabase import supabase
    from app.agents.organizer import reorganize_all

    try:
        result = supabase.table("notes").select("user_id").execute()
        user_ids = {row["user_id"] for row in (result.data or [])}
        for uid in user_ids:
            try:
                asyncio.run(reorganize_all(uid))
            except Exception as exc:
                log.error("weekly_reorg: failed for user %s: %s", uid, exc)
    except Exception as exc:
        log.error("weekly_reorg: failed to fetch users: %s", exc)
