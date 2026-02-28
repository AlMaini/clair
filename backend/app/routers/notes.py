from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

from app.models.schemas import NoteCreate, NoteResponse

router = APIRouter()


class NoteCreatedResponse(BaseModel):
    id: str


@router.post("/", response_model=NoteCreatedResponse, status_code=201)
async def create_note(
    note: NoteCreate,
    file: UploadFile | None = File(default=None),
):
    """Accept a new note, persist raw content to Supabase, queue a Celery task."""
    # TODO: save to Supabase and enqueue process_note.delay(note_id)
    return {"id": "placeholder-note-id"}


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    """Fetch a single note by ID."""
    # TODO: query Supabase
    return {
        "id": note_id,
        "raw_content": "",
        "processed_content": None,
        "content_type": "text",
        "category": None,
        "tags": [],
        "resources": [],
        "created_at": "2024-01-01T00:00:00Z",
    }


@router.get("/", response_model=list[NoteResponse])
async def list_notes(category_id: str | None = None):
    """List all notes, optionally filtered by category."""
    # TODO: query Supabase with optional category filter
    return []
