import asyncio

from openai import OpenAI

from app.config import settings

EMBEDDING_MODEL = "text-embedding-3-small"
_MAX_CHARS = 8_000  # safe truncation limit (~2 k tokens)


async def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dimension vector embedding via OpenAI.

    Uses text-embedding-3-small which produces 1536-dim vectors matching
    the pgvector column definition in the notes table.

    Args:
        text: The text to embed (truncated to _MAX_CHARS if longer).

    Returns:
        List of 1536 floats representing the embedding.
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = await asyncio.to_thread(
        lambda: client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text[:_MAX_CHARS],
        )
    )
    return response.data[0].embedding
