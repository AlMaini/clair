import asyncio

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_user_id
from app.models.schemas import CategoryResponse
from app.services.supabase import supabase

router = APIRouter()


@router.get("/", response_model=list[CategoryResponse])
async def list_categories(user_id: str = Depends(get_user_id)):
    """Return all categories for the current user, ordered alphabetically."""
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("categories")
            .select("id, name, description, note_count")
            .eq("user_id", user_id)
            .order("name")
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return [
        CategoryResponse(
            id=str(row["id"]),
            name=row["name"],
            description=row.get("description") or "",
            note_count=row.get("note_count") or 0,
        )
        for row in (result.data or [])
    ]
