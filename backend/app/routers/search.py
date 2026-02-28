import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.dependencies import get_user_id
from app.models.schemas import SearchQuery, SearchResult
from app.routers.notes import NOTE_SELECT, _row_to_note
from app.services.supabase import supabase

router = APIRouter()


@router.post("/", response_model=SearchResult)
async def search_notes(
    query: SearchQuery,
    user_id: str = Depends(get_user_id),
):
    """Search the current user's notes.

    mode=keyword  — fast ilike search, no LLM, no vector
    mode=semantic — vector similarity only (needs embeddings to exist)
    mode=hybrid   — LLM query interpretation + keyword + vector (default)
    """
    if query.mode == "keyword":
        # Fast path: plain ilike, no AI involved
        try:
            result = await asyncio.to_thread(
                lambda: supabase.table("notes")
                .select(NOTE_SELECT)
                .eq("user_id", user_id)
                .ilike("raw_content", f"%{query.query}%")
                .order("created_at", desc=True)
                .execute()
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

        return {"notes": [_row_to_note(r) for r in (result.data or [])]}

    # Hybrid / semantic: delegate to the search agent
    from app.agents.search_agent import semantic_search

    try:
        notes = await semantic_search(query.query, user_id, mode=query.mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"notes": notes}


@router.post("/voice", response_model=SearchResult)
async def voice_search(
    file: UploadFile = File(...),
    mode: Annotated[Literal["hybrid", "semantic", "keyword"], Form()] = "hybrid",
    user_id: str = Depends(get_user_id),
):
    """Transcribe an audio clip via Whisper then run a hybrid search.

    The frontend records a voice query and posts it here as multipart/form-data.
    Whisper converts the audio to text, which is then fed into semantic_search.
    """
    from app.agents.search_agent import voice_search as _voice_search

    file_bytes = await file.read()
    try:
        notes = await _voice_search(
            file_bytes,
            user_id,
            filename=file.filename or "audio.m4a",
            mode=mode,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"notes": notes}
