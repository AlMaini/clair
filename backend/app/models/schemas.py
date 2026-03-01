from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class NoteCreate(BaseModel):
    content: str
    content_type: Literal["text", "voice", "image", "link"]
    source_url: str | None = None


class NoteUpdate(BaseModel):
    content: str | None = None
    processed_content: str | None = None
    title: str | None = None
    tags: list[str] | None = None
    color: str | None = None
    source_url: str | None = None


class NoteResponse(BaseModel):
    id: str
    raw_content: str
    processed_content: str | None
    content_type: str
    category: dict | None
    tags: list[str]
    resources: list[dict]
    file_path: str | None
    related_note_ids: list[str]
    created_at: datetime
    title: str | None = None
    color: str | None = None


class SearchQuery(BaseModel):
    query: str
    mode: Literal["hybrid", "semantic", "keyword"] = "hybrid"


class SearchResult(BaseModel):
    notes: list[NoteResponse]


class CategoryCreate(BaseModel):
    name: str
    description: str = ""


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: str
    note_count: int
