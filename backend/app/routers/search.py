import asyncio

from fastapi import APIRouter, Depends, HTTPException

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

    Currently implemented as a case-insensitive keyword search against raw_content.
    TODO: replace with search_agent.semantic_search for hybrid vector + keyword search
    once the agent is implemented (mode field will be respected then).
    """
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

    notes = [_row_to_note(row) for row in (result.data or [])]
    return {"notes": notes}
