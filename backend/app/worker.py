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
