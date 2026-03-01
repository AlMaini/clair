import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.dependencies import get_user_id
from app.models.schemas import NoteResponse, NoteUpdate
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
        related_note_ids=[str(r) for r in (row.get("related_note_ids") or [])],
        created_at=row["created_at"],
        title=row.get("title"),
        color=row.get("color"),
    )


def _not_found_or(e: Exception) -> HTTPException:
    detail = str(e)
    if "PGRST116" in detail or "0 rows" in detail:
        return HTTPException(status_code=404, detail="Note not found")
    return HTTPException(status_code=400, detail=detail)


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

    Accepts multipart/form-data so voice and image notes can include a file.
    For text/link notes, send content as a plain form field with no file.
    For voice/image notes, send content="" and attach the file — the Celery
    worker transcribes it and populates raw_content.
    """
    payload: dict = {
        "user_id": user_id,
        "raw_content": content,
        "content_type": content_type,
        "source_url": source_url,
        "tags": [],
        "related_note_ids": [],
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

    try:
        from app.worker import process_note
        process_note.delay(note_id)
    except Exception:
        pass

    return {"id": note_id}


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    category_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(get_user_id),
):
    """List the current user's notes, newest first. Supports pagination."""
    try:
        query = (
            supabase.table("notes")
            .select(NOTE_SELECT)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if category_id:
            query = query.eq("category_id", category_id)

        result = await asyncio.to_thread(lambda: query.execute())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return [_row_to_note(row) for row in (result.data or [])]


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, user_id: str = Depends(get_user_id)):
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
        raise _not_found_or(e)

    return _row_to_note(result.data)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    body: NoteUpdate,
    user_id: str = Depends(get_user_id),
):
    """Update editable fields on a note.

    Only the fields present in the request body are changed. Updating content
    does NOT automatically re-run the AI pipeline — call /reprocess for that.
    """
    patch: dict = {}
    if body.content is not None:
        patch["raw_content"] = body.content
    if body.title is not None:
        patch["title"] = body.title
    if body.tags is not None:
        patch["tags"] = body.tags
    if body.color is not None:
        patch["color"] = body.color
    if body.source_url is not None:
        patch["source_url"] = body.source_url

    if not patch:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("notes")
            .update(patch)
            .eq("id", note_id)
            .eq("user_id", user_id)
            .select(NOTE_SELECT)
            .single()
            .execute()
        )
    except Exception as e:
        raise _not_found_or(e)

    return _row_to_note(result.data)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, user_id: str = Depends(get_user_id)):
    """Delete a note, its resources (cascade), and its storage file if any."""
    # Fetch file_path before deleting so we can clean up storage
    try:
        meta = await asyncio.to_thread(
            lambda: supabase.table("notes")
            .select("file_path")
            .eq("id", note_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as e:
        raise _not_found_or(e)

    file_path: str | None = meta.data.get("file_path")

    # Delete the DB row (resources cascade automatically)
    try:
        await asyncio.to_thread(
            lambda: supabase.table("notes")
            .delete()
            .eq("id", note_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Best-effort storage cleanup — don't fail the request if it errors
    if file_path:
        try:
            await asyncio.to_thread(
                lambda: supabase.storage.from_("note-files").remove([file_path])
            )
        except Exception:
            pass


@router.post("/{note_id}/reprocess", status_code=202)
async def reprocess_note(note_id: str, user_id: str = Depends(get_user_id)):
    """Re-queue the full AI pipeline (organize → embed → research) for a note.

    Useful after editing a note's content or if the initial pipeline failed.
    Returns 202 Accepted immediately; processing happens asynchronously.
    """
    # Verify ownership
    try:
        await asyncio.to_thread(
            lambda: supabase.table("notes")
            .select("id")
            .eq("id", note_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as e:
        raise _not_found_or(e)

    try:
        from app.worker import process_note
        process_note.delay(note_id)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Queue unavailable: {e}")

    return {"queued": True, "note_id": note_id}


@router.get("/{note_id}/file-url")
async def get_file_url(
    note_id: str,
    user_id: str = Depends(get_user_id),
    expires_in: int = 3600,
):
    """Return a short-lived signed URL for the file attached to a note."""
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
        raise _not_found_or(e)

    file_path: str | None = result.data.get("file_path")
    if not file_path:
        raise HTTPException(status_code=404, detail="Note has no attached file")

    url = await asyncio.to_thread(get_signed_url, file_path, expires_in)
    return {"url": url, "expires_in": expires_in}
