import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.dependencies import get_user_id
from app.models.schemas import NoteResponse
from app.services.storage import get_signed_url, upload_file
from app.services.supabase import supabase

router = APIRouter()

# Columns fetched on every note query — includes joined category and resources
NOTE_SELECT = (
    "*, "
    "categories(id, name, description, note_count), "
    "resources(id, title, url, resource_type, created_at)"
)

ContentType = Literal["text", "voice", "image", "link"]


def _row_to_note(row: dict) -> NoteResponse:
    """Map a raw Supabase row (with joined tables) to NoteResponse."""
    category = row.get("categories")
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
        file_path=row.get("file_path"),
        created_at=row["created_at"],
    )


class NoteCreated(BaseModel):
    id: str


@router.post("/", response_model=NoteCreated, status_code=201)
async def create_note(
    content_type: Annotated[ContentType, Form()],
    content: Annotated[str, Form()] = "",
    source_url: Annotated[str | None, Form()] = None,
    file: UploadFile | None = File(default=None),
    user_id: str = Depends(get_user_id),
):
    """Persist a note to Supabase and queue the AI processing pipeline.

    Accepts multipart/form-data so that voice and image notes can include a
    file upload alongside the note metadata. Text and link notes send content
    as a plain form field with no file attached.

    Voice/image notes: submit content="" and attach the file — the Celery
    worker will populate raw_content after transcription/OCR.
    """
    payload: dict = {
        "user_id": user_id,
        "raw_content": content,
        "content_type": content_type,
        "source_url": source_url,
        "tags": [],
    }

    if file and file.filename:
        file_bytes = await file.read()
        mime = file.content_type or "application/octet-stream"
        file_path = await asyncio.to_thread(
            upload_file, user_id, file.filename, file_bytes, mime
        )
        payload["file_path"] = file_path

    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("notes").insert(payload).execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    note_id: str = result.data[0]["id"]

    # Enqueue AI processing — silently skip if Redis isn't up yet
    try:
        from app.worker import process_note

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


@router.get("/{note_id}/file-url")
async def get_file_url(
    note_id: str,
    user_id: str = Depends(get_user_id),
    expires_in: int = 3600,
):
    """Return a short-lived signed URL for the file attached to a note.

    The URL is valid for `expires_in` seconds (default 1 hour). The frontend
    should call this on demand (e.g. when the user opens a voice/image note)
    rather than storing the URL, since it expires.
    """
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("notes")
            .select("file_path")
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

    file_path: str | None = result.data.get("file_path")
    if not file_path:
        raise HTTPException(status_code=404, detail="Note has no attached file")

    url = await asyncio.to_thread(get_signed_url, file_path, expires_in)
    return {"url": url, "expires_in": expires_in}
