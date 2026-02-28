from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class NoteCreate(BaseModel):
    content: str
    content_type: Literal["text", "voice", "image", "link"]
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
    created_at: datetime


class SearchQuery(BaseModel):
    query: str
    mode: Literal["hybrid", "semantic", "keyword"] = "hybrid"


class SearchResult(BaseModel):
    notes: list[NoteResponse]


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: str
    note_count: int
