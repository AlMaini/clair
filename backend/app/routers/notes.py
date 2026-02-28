import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.dependencies import get_user_id
from app.models.schemas import NoteCreate, NoteResponse
from app.services.supabase import supabase

router = APIRouter()

# Columns to fetch on every note query — includes related category and resources
NOTE_SELECT = (
    "*, "
    "categories(id, name, description, note_count), "
    "resources(id, title, url, resource_type, created_at)"
)


def _row_to_note(row: dict) -> NoteResponse:
    """Map a raw Supabase row (with joined tables) to a NoteResponse."""
    category = row.get("categories")
    # For a FK join, Supabase returns a dict or None.
    # Guard against the empty-list edge case in some client versions.
    if isinstance(category, list):
        category = category[0] if category else None

    return NoteResponse(
        id=str(row["id"]),
        raw_content=row["raw_content"],
        processed_content=row.get("processed_content"),
        content_type=row["content_type"],
        category=category,
        tags=row.get("tags") or [],
        resources=row.get("resources") or [],
        created_at=row["created_at"],
    )


class NoteCreated(BaseModel):
    id: str


@router.post("/", response_model=NoteCreated, status_code=201)
async def create_note(
    note: NoteCreate,
    file: UploadFile | None = File(default=None),
    user_id: str = Depends(get_user_id),
):
    """Persist raw note content to Supabase and queue the AI processing pipeline."""
    payload: dict = {
        "user_id": user_id,
        "raw_content": note.content,
        "content_type": note.content_type,
        "source_url": note.source_url,
        "tags": [],
    }

    if file:
        # TODO: upload to Supabase Storage bucket "note-files", then:
        #   file_bytes = await file.read()
        #   path = f"{user_id}/{uuid4()}-{file.filename}"
        #   supabase.storage.from_("note-files").upload(path, file_bytes)
        #   payload["file_path"] = path
        pass

    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("notes").insert(payload).execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    note_id: str = result.data[0]["id"]

    # Enqueue the Celery task — fail silently if Redis isn't up yet
    try:
        from app.worker import process_note  # avoid circular import at module load

        process_note.delay(note_id)
    except Exception:
        pass

    return {"id": note_id}


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    category_id: str | None = None,
    user_id: str = Depends(get_user_id),
):
    """List all notes for the current user, newest first."""
    try:
        query = (
            supabase.table("notes")
            .select(NOTE_SELECT)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
        )
        if category_id:
            query = query.eq("category_id", category_id)

        result = await asyncio.to_thread(lambda: query.execute())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return [_row_to_note(row) for row in (result.data or [])]


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    user_id: str = Depends(get_user_id),
):
    """Fetch a single note by ID (scoped to the current user)."""
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("notes")
            .select(NOTE_SELECT)
            .eq("id", note_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as e:
        detail = str(e)
        if "PGRST116" in detail or "0 rows" in detail:
            raise HTTPException(status_code=404, detail="Note not found")
        raise HTTPException(status_code=400, detail=detail)

    return _row_to_note(result.data)
