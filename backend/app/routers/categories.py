import asyncio

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_user_id
from app.models.schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.supabase import supabase

router = APIRouter()


def _not_found_or(e: Exception) -> HTTPException:
    detail = str(e)
    if "PGRST116" in detail or "0 rows" in detail:
        return HTTPException(status_code=404, detail="Category not found")
    return HTTPException(status_code=400, detail=detail)


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


@router.post("/", response_model=CategoryResponse, status_code=201)
async def create_category(body: CategoryCreate, user_id: str = Depends(get_user_id)):
    """Create a new category for the current user."""
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("categories")
            .insert(
                {
                    "user_id": user_id,
                    "name": body.name,
                    "description": body.description,
                    "note_count": 0,
                }
            )
            .select("id, name, description, note_count")
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    row = result.data
    return CategoryResponse(
        id=str(row["id"]),
        name=row["name"],
        description=row.get("description") or "",
        note_count=row.get("note_count") or 0,
    )


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    body: CategoryUpdate,
    user_id: str = Depends(get_user_id),
):
    """Update name or description of a category."""
    patch: dict = {}
    if body.name is not None:
        patch["name"] = body.name
    if body.description is not None:
        patch["description"] = body.description

    if not patch:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("categories")
            .update(patch)
            .eq("id", category_id)
            .eq("user_id", user_id)
            .select("id, name, description, note_count")
            .single()
            .execute()
        )
    except Exception as e:
        raise _not_found_or(e)

    row = result.data
    return CategoryResponse(
        id=str(row["id"]),
        name=row["name"],
        description=row.get("description") or "",
        note_count=row.get("note_count") or 0,
    )


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: str, user_id: str = Depends(get_user_id)):
    """Delete a category. Notes in this category will have their category_id set to NULL."""
    # Verify ownership first
    try:
        await asyncio.to_thread(
            lambda: supabase.table("categories")
            .select("id")
            .eq("id", category_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as e:
        raise _not_found_or(e)

    try:
        await asyncio.to_thread(
            lambda: supabase.table("categories")
            .delete()
            .eq("id", category_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
