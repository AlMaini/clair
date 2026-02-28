async def organize_note(note_id: str) -> None:
    """Classify and organize a note using Featherless.ai.

    Uses the Featherless OpenAI-compatible API (via `services.ai_client`) to:
    - Determine the best category for the note (creating one if none fits)
    - Extract relevant tags
    - Generate a clean, structured `processed_content` from the raw input
    - Update the note row in Supabase with the results

    Args:
        note_id: UUID of the note to organize.
    """
    pass
