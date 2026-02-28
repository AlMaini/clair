async def semantic_search(query: str, user_id: str) -> list[dict]:
    """Perform a hybrid semantic + keyword search over a user's notes.

    Steps:
    1. Generate an embedding for the query text via `embeddings.generate_embedding`
    2. Run a pgvector cosine-similarity search against `notes.embedding` in Supabase
    3. Combine with a full-text keyword search for hybrid ranking
    4. Return results scoped to `user_id`, ordered by relevance score

    Args:
        query: Natural-language search query from the user.
        user_id: UUID of the authenticated user (for RLS scoping).

    Returns:
        List of note dicts ordered by relevance, each matching the NoteResponse schema.
    """
    return []
