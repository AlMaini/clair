async def research_note(note_id: str) -> None:
    """Enrich a note with relevant external resources.

    Uses Claude to analyze the note content and then searches for related:
    - YouTube videos
    - Articles / blog posts
    - Social media posts (Twitter/X, Reddit)

    Saves discovered resources to the `resources` table in Supabase,
    linked to the given note.

    Args:
        note_id: UUID of the note to research.
    """
    pass
