from celery import Celery

from app.config import settings

celery_app = Celery("clair", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="process_note")
def process_note(note_id: str) -> None:
    """Process a newly created note through the full AI pipeline.

    Runs sequentially:
    1. organizer.organize_note  — classify, tag, and clean the note
    2. researcher.research_note — find and attach external resources
    3. embeddings.generate_embedding — generate and store the vector embedding

    Args:
        note_id: UUID of the note to process.
    """
    import asyncio
    from app.agents.organizer import organize_note
    from app.agents.researcher import research_note

    asyncio.run(organize_note(note_id))
    asyncio.run(research_note(note_id))
    # TODO: fetch processed_content, call generate_embedding, store in Supabase
