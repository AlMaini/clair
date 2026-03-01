from openai import AsyncOpenAI

from app.config import settings

# OpenAI-compatible client pointed at Featherless.ai
# Docs: https://featherless.ai/docs/overview
ai_client = AsyncOpenAI(
    api_key=settings.FEATHERLESS_API_KEY,
    base_url=settings.FEATHERLESS_BASE_URL,
)
