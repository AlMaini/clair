from fastapi import APIRouter

from app.models.schemas import CategoryResponse

router = APIRouter()


@router.get("/", response_model=list[CategoryResponse])
async def list_categories():
    """Return all categories belonging to the authenticated user."""
    # TODO: query Supabase categories table filtered by user
    return []
