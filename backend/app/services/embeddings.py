import asyncio

from openai import OpenAI

from app.config import settings

_MAX_CHARS = 8_000  # ~2 048 tokens, matching gemini-embedding-001 input limit


async def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dimension vector embedding via Gemini gemini-embedding-001."""
    client = OpenAI(
        api_key=settings.GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    response = await asyncio.to_thread(
        lambda: client.embeddings.create(
            model=settings.GEMINI_EMBEDDING_MODEL,
            input=text[:_MAX_CHARS],
            dimensions=1536,
        )
    )
    return response.data[0].embedding
