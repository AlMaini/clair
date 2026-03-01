from openai import AsyncOpenAI

from app.config import settings

# OpenAI-compatible client pointed at Google's Gemini API
# Docs: https://ai.google.dev/gemini-api/docs/openai
ai_client = AsyncOpenAI(
    api_key=settings.GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)
