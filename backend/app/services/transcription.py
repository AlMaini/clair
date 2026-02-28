import asyncio
import io

from openai import OpenAI

from app.config import settings


async def transcribe_audio(file_bytes: bytes, filename: str = "audio.m4a") -> str:
    """Transcribe audio bytes to text using OpenAI Whisper.

    Args:
        file_bytes: Raw audio file bytes (mp3, wav, m4a, webm, etc.)
        filename: Original filename — Whisper uses the extension to detect format.

    Returns:
        Transcribed text string.
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    file_obj = io.BytesIO(file_bytes)
    file_obj.name = filename  # required by the Whisper SDK to infer the codec

    response = await asyncio.to_thread(
        lambda: client.audio.transcriptions.create(
            model="whisper-1",
            file=file_obj,
        )
    )
    return response.text
