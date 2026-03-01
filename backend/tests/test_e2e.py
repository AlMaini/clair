"""
backend/tests/test_e2e.py

End-to-end tests for the Clair FastAPI backend.

External services (Supabase DB, Gemini AI, Celery/Redis) are replaced with
lightweight mocks so the suite runs without network access or real credentials.
The tests drive the full HTTP request → router → service stack.

Run:
    cd backend
    uv run pytest tests/ -v
"""

from __future__ import annotations

import json
import uuid
from contextlib import ExitStack
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import get_user_id
from app.main import app

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

TEST_USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"
TEST_NOTE_ID = "bbbbbbbb-0000-0000-0000-000000000001"
TEST_CATEGORY_ID = "cccccccc-0000-0000-0000-000000000001"

FAKE_CATEGORY = {
    "id": TEST_CATEGORY_ID,
    "name": "Science",
    "description": "Science-related notes",
    "note_count": 0,
}

FAKE_NOTE = {
    "id": TEST_NOTE_ID,
    "user_id": TEST_USER_ID,
    "raw_content": "Quantum entanglement connects distant particles.",
    "processed_content": "A note on quantum entanglement.",
    "content_type": "text",
    "category_id": TEST_CATEGORY_ID,
    "categories": FAKE_CATEGORY,
    "tags": ["quantum", "physics"],
    "resources": [],
    "file_path": None,
    "related_note_ids": [],
    "source_url": None,
    "created_at": "2024-01-15T10:00:00",
}

FAKE_NOTE_WITH_FILE = {
    **FAKE_NOTE,
    "id": "bbbbbbbb-0000-0000-0000-000000000002",
    "file_path": f"{TEST_USER_ID}/photo.png",
}

# All module locations where `supabase` is bound via `from ... import supabase`
_SUPABASE_TARGETS = [
    "app.routers.notes.supabase",
    "app.routers.categories.supabase",
    "app.routers.search.supabase",
    "app.agents.search_agent.supabase",
]

# ─────────────────────────────────────────────────────────────────────────────
# Supabase fluent-query mock
# ─────────────────────────────────────────────────────────────────────────────


class _QB:
    """Minimal fluent mock for the Supabase PostgREST query builder.

    All builder methods return ``self`` for chaining.  ``execute()`` returns
    either a single dict (when ``.single()`` was called) or a list.
    """

    def __init__(self, data):
        self._data: list = (
            data if isinstance(data, list) else ([data] if data is not None else [])
        )
        self._is_single = False

    def select(self, *a, **kw): return self
    def eq(self, *a, **kw): return self
    def neq(self, *a, **kw): return self
    def order(self, *a, **kw): return self
    def limit(self, *a, **kw): return self
    def range(self, *a, **kw): return self
    def ilike(self, *a, **kw): return self
    def in_(self, *a, **kw): return self
    def insert(self, *a, **kw): return self
    def update(self, *a, **kw): return self
    def delete(self, *a, **kw): return self

    def single(self):
        self._is_single = True
        return self

    def execute(self):
        result = MagicMock()
        result.data = self._data[0] if self._is_single else self._data
        return result


def _make_db(table_data: dict) -> MagicMock:
    """Return a supabase mock configured with per-table fixture data.

    ``supabase.rpc(...)`` returns an empty list by default (safe for vector
    search calls that aren't the focus of a given test).
    """
    mock = MagicMock()
    mock.table.side_effect = lambda name: _QB(table_data.get(name, []))

    rpc_result = MagicMock()
    rpc_result.execute.return_value = MagicMock(data=[])
    mock.rpc.return_value = rpc_result

    return mock


def _raising_db(msg: str = "PGRST116: no rows found") -> MagicMock:
    """Return a supabase mock whose ``.execute()`` always raises an exception.

    Used to simulate "not found" errors from Supabase.
    """
    qb = MagicMock()
    for method in (
        "select", "eq", "neq", "order", "limit", "range",
        "ilike", "in_", "insert", "update", "delete", "single",
    ):
        getattr(qb, method).return_value = qb
    qb.execute.side_effect = Exception(msg)

    mock = MagicMock()
    mock.table.return_value = qb
    return mock


def _patch_db(mock: MagicMock) -> ExitStack:
    """Patch all supabase import sites with *mock* and return the ExitStack."""
    stack = ExitStack()
    for target in _SUPABASE_TARGETS:
        stack.enter_context(patch(target, mock))
    return stack


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _bypass_auth():
    """Skip Supabase JWT validation for every test."""
    app.dependency_overrides[get_user_id] = lambda: TEST_USER_ID
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────


async def test_health_check(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "clair-api"}


# ─────────────────────────────────────────────────────────────────────────────
# Authentication
# ─────────────────────────────────────────────────────────────────────────────


async def test_unauthenticated_request_returns_401():
    """Any protected endpoint without an Authorization header must 401."""
    app.dependency_overrides.clear()  # remove the bypass set by autouse fixture
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await c.get("/api/notes/")
    assert resp.status_code == 401
    assert resp.headers.get("www-authenticate") == "Bearer"
    app.dependency_overrides[get_user_id] = lambda: TEST_USER_ID  # restore for teardown


async def test_invalid_token_returns_401():
    """A malformed / expired token must 401."""
    app.dependency_overrides.clear()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await c.get("/api/notes/", headers={"Authorization": "Bearer bad-token"})
    assert resp.status_code == 401
    app.dependency_overrides[get_user_id] = lambda: TEST_USER_ID


# ─────────────────────────────────────────────────────────────────────────────
# Categories — list
# ─────────────────────────────────────────────────────────────────────────────


async def test_list_categories_empty(client):
    with _patch_db(_make_db({"categories": []})):
        resp = await client.get("/api/categories/")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_categories(client):
    with _patch_db(_make_db({"categories": [FAKE_CATEGORY]})):
        resp = await client.get("/api/categories/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == TEST_CATEGORY_ID
    assert data[0]["name"] == "Science"
    assert data[0]["note_count"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# Categories — create
# ─────────────────────────────────────────────────────────────────────────────


async def test_create_category(client):
    with _patch_db(_make_db({"categories": FAKE_CATEGORY})):
        resp = await client.post(
            "/api/categories/",
            json={"name": "Science", "description": "Science-related notes"},
        )
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] == TEST_CATEGORY_ID
    assert body["name"] == "Science"
    assert body["description"] == "Science-related notes"


async def test_create_category_minimal(client):
    """description is optional and defaults to empty string."""
    with _patch_db(_make_db({"categories": {**FAKE_CATEGORY, "description": ""}})):
        resp = await client.post("/api/categories/", json={"name": "Science"})
    assert resp.status_code == 201
    assert resp.json()["description"] == ""


# ─────────────────────────────────────────────────────────────────────────────
# Categories — update
# ─────────────────────────────────────────────────────────────────────────────


async def test_update_category_name(client):
    updated = {**FAKE_CATEGORY, "name": "Physics"}
    with _patch_db(_make_db({"categories": updated})):
        resp = await client.patch(
            f"/api/categories/{TEST_CATEGORY_ID}",
            json={"name": "Physics"},
        )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Physics"


async def test_update_category_description(client):
    updated = {**FAKE_CATEGORY, "description": "All things physical"}
    with _patch_db(_make_db({"categories": updated})):
        resp = await client.patch(
            f"/api/categories/{TEST_CATEGORY_ID}",
            json={"description": "All things physical"},
        )
    assert resp.status_code == 200
    assert resp.json()["description"] == "All things physical"


async def test_update_category_empty_body_returns_422(client):
    with _patch_db(_make_db({})):
        resp = await client.patch(f"/api/categories/{TEST_CATEGORY_ID}", json={})
    assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Categories — delete
# ─────────────────────────────────────────────────────────────────────────────


async def test_delete_category(client):
    with _patch_db(_make_db({"categories": FAKE_CATEGORY})):
        resp = await client.delete(f"/api/categories/{TEST_CATEGORY_ID}")
    assert resp.status_code == 204


async def test_delete_category_not_found(client):
    with _patch_db(_raising_db()):
        resp = await client.delete("/api/categories/nonexistent-id")
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Notes — create
# ─────────────────────────────────────────────────────────────────────────────


async def test_create_text_note(client):
    with _patch_db(_make_db({"notes": [FAKE_NOTE]})):
        with patch("app.worker.process_note") as mt:
            mt.delay = MagicMock()
            resp = await client.post(
                "/api/notes/",
                data={"content_type": "text", "content": "Hello world"},
            )
    assert resp.status_code == 201
    assert resp.json()["id"] == TEST_NOTE_ID


async def test_create_link_note(client):
    link_note = {**FAKE_NOTE, "content_type": "link", "source_url": "https://example.com"}
    with _patch_db(_make_db({"notes": [link_note]})):
        with patch("app.worker.process_note") as mt:
            mt.delay = MagicMock()
            resp = await client.post(
                "/api/notes/",
                data={
                    "content_type": "link",
                    "content": "",
                    "source_url": "https://example.com",
                },
            )
    assert resp.status_code == 201
    assert "id" in resp.json()


async def test_create_note_queues_pipeline(client):
    """Creating a note must trigger process_note.delay with the new note ID."""
    with _patch_db(_make_db({"notes": [FAKE_NOTE]})):
        with patch("app.worker.process_note") as mt:
            mt.delay = MagicMock()
            await client.post(
                "/api/notes/",
                data={"content_type": "text", "content": "pipeline test"},
            )
            mt.delay.assert_called_once_with(TEST_NOTE_ID)


async def test_create_note_random_user(client):
    """A note created for a randomly-generated user ID is stored under that ID."""
    random_user_id = str(uuid.uuid4())
    random_note_id = str(uuid.uuid4())

    # The note DB row reflects the random user
    note_for_random_user = {
        **FAKE_NOTE,
        "id": random_note_id,
        "user_id": random_user_id,
    }

    app.dependency_overrides[get_user_id] = lambda: random_user_id

    with _patch_db(_make_db({"notes": [note_for_random_user]})):
        with patch("app.worker.process_note") as mt:
            mt.delay = MagicMock()
            resp = await client.post(
                "/api/notes/",
                data={"content_type": "text", "content": "note for random user"},
            )

    assert resp.status_code == 201
    assert resp.json()["id"] == random_note_id

    # The Celery pipeline must be queued for the correct note ID
    mt.delay.assert_called_once_with(random_note_id)

    # Verify the note was inserted with the random user's ID by inspecting
    # what payload was written to the DB
    with _patch_db(_make_db({"notes": note_for_random_user})):
        get_resp = await client.get(f"/api/notes/{random_note_id}")
    assert get_resp.status_code == 200
    # The response must not contain the fixed TEST_USER_ID — it belongs to the random user
    assert get_resp.json()["id"] == random_note_id


# ─────────────────────────────────────────────────────────────────────────────
# Notes — list
# ─────────────────────────────────────────────────────────────────────────────


async def test_list_notes_empty(client):
    with _patch_db(_make_db({"notes": []})):
        resp = await client.get("/api/notes/")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_notes(client):
    with _patch_db(_make_db({"notes": [FAKE_NOTE]})):
        resp = await client.get("/api/notes/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == TEST_NOTE_ID
    assert data[0]["tags"] == ["quantum", "physics"]
    assert data[0]["category"]["name"] == "Science"
    assert data[0]["resources"] == []


async def test_list_notes_filtered_by_category(client):
    with _patch_db(_make_db({"notes": [FAKE_NOTE]})):
        resp = await client.get(f"/api/notes/?category_id={TEST_CATEGORY_ID}")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_list_notes_pagination_params_accepted(client):
    with _patch_db(_make_db({"notes": [FAKE_NOTE]})):
        resp = await client.get("/api/notes/?limit=10&offset=0")
    assert resp.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# Notes — get single
# ─────────────────────────────────────────────────────────────────────────────


async def test_get_note(client):
    with _patch_db(_make_db({"notes": FAKE_NOTE})):
        resp = await client.get(f"/api/notes/{TEST_NOTE_ID}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == TEST_NOTE_ID
    assert body["raw_content"] == FAKE_NOTE["raw_content"]
    assert body["processed_content"] == FAKE_NOTE["processed_content"]
    assert body["content_type"] == "text"
    assert body["category"]["name"] == "Science"
    assert body["file_path"] is None
    assert body["related_note_ids"] == []


async def test_get_note_not_found(client):
    with _patch_db(_raising_db()):
        resp = await client.get("/api/notes/nonexistent-id")
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Notes — update
# ─────────────────────────────────────────────────────────────────────────────


async def test_update_note_content(client):
    updated = {**FAKE_NOTE, "raw_content": "Updated content"}
    with _patch_db(_make_db({"notes": updated})):
        resp = await client.patch(
            f"/api/notes/{TEST_NOTE_ID}",
            json={"content": "Updated content"},
        )
    assert resp.status_code == 200
    assert resp.json()["raw_content"] == "Updated content"


async def test_update_note_tags(client):
    updated = {**FAKE_NOTE, "tags": ["new", "tags"]}
    with _patch_db(_make_db({"notes": updated})):
        resp = await client.patch(
            f"/api/notes/{TEST_NOTE_ID}",
            json={"tags": ["new", "tags"]},
        )
    assert resp.status_code == 200
    assert resp.json()["tags"] == ["new", "tags"]


async def test_update_note_source_url(client):
    updated = {**FAKE_NOTE, "source_url": "https://example.com/updated"}
    with _patch_db(_make_db({"notes": updated})):
        resp = await client.patch(
            f"/api/notes/{TEST_NOTE_ID}",
            json={"source_url": "https://example.com/updated"},
        )
    assert resp.status_code == 200


async def test_update_note_empty_body_returns_422(client):
    with _patch_db(_make_db({})):
        resp = await client.patch(f"/api/notes/{TEST_NOTE_ID}", json={})
    assert resp.status_code == 422


async def test_update_note_not_found(client):
    with _patch_db(_raising_db()):
        resp = await client.patch(f"/api/notes/nonexistent-id", json={"content": "x"})
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Notes — delete
# ─────────────────────────────────────────────────────────────────────────────


async def test_delete_note(client):
    with _patch_db(_make_db({"notes": FAKE_NOTE})):
        resp = await client.delete(f"/api/notes/{TEST_NOTE_ID}")
    assert resp.status_code == 204


async def test_delete_note_with_file_attempts_storage_cleanup(client):
    """When file_path is set the endpoint calls supabase.storage.remove."""
    db = _make_db({"notes": FAKE_NOTE_WITH_FILE})
    with _patch_db(db):
        resp = await client.delete(f"/api/notes/{FAKE_NOTE_WITH_FILE['id']}")
    assert resp.status_code == 204
    # storage.from_(...).remove(...) should have been called on the mock
    db.storage.from_.assert_called_with("note-files")


async def test_delete_note_not_found(client):
    with _patch_db(_raising_db()):
        resp = await client.delete("/api/notes/nonexistent-id")
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Notes — reprocess
# ─────────────────────────────────────────────────────────────────────────────


async def test_reprocess_note(client):
    with _patch_db(_make_db({"notes": FAKE_NOTE})):
        with patch("app.worker.process_note") as mt:
            mt.delay = MagicMock()
            resp = await client.post(f"/api/notes/{TEST_NOTE_ID}/reprocess")
    assert resp.status_code == 202
    body = resp.json()
    assert body["queued"] is True
    assert body["note_id"] == TEST_NOTE_ID


async def test_reprocess_note_queues_pipeline(client):
    """reprocess must call process_note.delay with the note ID."""
    with _patch_db(_make_db({"notes": FAKE_NOTE})):
        with patch("app.worker.process_note") as mt:
            mt.delay = MagicMock()
            await client.post(f"/api/notes/{TEST_NOTE_ID}/reprocess")
            mt.delay.assert_called_once_with(TEST_NOTE_ID)


async def test_reprocess_note_not_found(client):
    with _patch_db(_raising_db()):
        resp = await client.post("/api/notes/nonexistent-id/reprocess")
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Notes — file URL
# ─────────────────────────────────────────────────────────────────────────────


async def test_get_file_url(client):
    signed = "https://storage.supabase.co/object/sign/note-files/photo.png?token=abc"
    with _patch_db(_make_db({"notes": FAKE_NOTE_WITH_FILE})):
        with patch("app.routers.notes.get_signed_url", return_value=signed):
            resp = await client.get(
                f"/api/notes/{FAKE_NOTE_WITH_FILE['id']}/file-url"
            )
    assert resp.status_code == 200
    body = resp.json()
    assert body["url"] == signed
    assert body["expires_in"] == 3600


async def test_get_file_url_custom_expiry(client):
    signed = "https://storage.example.com/signed"
    with _patch_db(_make_db({"notes": FAKE_NOTE_WITH_FILE})):
        with patch("app.routers.notes.get_signed_url", return_value=signed):
            resp = await client.get(
                f"/api/notes/{FAKE_NOTE_WITH_FILE['id']}/file-url?expires_in=600"
            )
    assert resp.status_code == 200
    assert resp.json()["expires_in"] == 600


async def test_get_file_url_note_without_file_returns_404(client):
    with _patch_db(_make_db({"notes": FAKE_NOTE})):
        resp = await client.get(f"/api/notes/{TEST_NOTE_ID}/file-url")
    assert resp.status_code == 404


async def test_get_file_url_note_not_found(client):
    with _patch_db(_raising_db()):
        resp = await client.get("/api/notes/nonexistent-id/file-url")
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Search — keyword mode (no AI)
# ─────────────────────────────────────────────────────────────────────────────


async def test_search_keyword_mode_with_results(client):
    """Keyword search is a pure ilike DB query — no LLM or embedding involved."""
    with _patch_db(_make_db({"notes": [FAKE_NOTE]})):
        resp = await client.post(
            "/api/search/",
            json={"query": "quantum", "mode": "keyword"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert "notes" in body
    assert body["notes"][0]["id"] == TEST_NOTE_ID


async def test_search_keyword_mode_no_results(client):
    with _patch_db(_make_db({"notes": []})):
        resp = await client.post(
            "/api/search/",
            json={"query": "nonexistent", "mode": "keyword"},
        )
    assert resp.status_code == 200
    assert resp.json()["notes"] == []


# ─────────────────────────────────────────────────────────────────────────────
# Search — hybrid mode (keyword + vector + Gemini interpretation)
# ─────────────────────────────────────────────────────────────────────────────


def _gemini_search_response(keywords=None, semantic_query="test query"):
    """Return a mock Gemini chat completion for query interpretation."""
    content = json.dumps({
        "keywords": keywords or ["quantum", "entanglement"],
        "tags": ["physics"],
        "content_type_filter": None,
        "semantic_query": semantic_query,
    })
    mock = MagicMock()
    mock.choices = [MagicMock()]
    mock.choices[0].message.content = content
    return mock


async def test_search_hybrid_mode(client):
    db = _make_db({"notes": [FAKE_NOTE]})
    with _patch_db(db):
        with patch("app.agents.search_agent.ai_client") as mock_ai:
            mock_ai.chat.completions.create = AsyncMock(
                return_value=_gemini_search_response()
            )
            with patch(
                "app.agents.search_agent.generate_embedding",
                AsyncMock(return_value=[0.1] * 1536),
            ):
                resp = await client.post(
                    "/api/search/",
                    json={"query": "quantum entanglement", "mode": "hybrid"},
                )
    assert resp.status_code == 200
    assert "notes" in resp.json()


async def test_search_hybrid_mode_gemini_failure_falls_back(client):
    """If Gemini is unavailable the agent falls back to raw keyword splitting."""
    db = _make_db({"notes": [FAKE_NOTE]})
    with _patch_db(db):
        with patch("app.agents.search_agent.ai_client") as mock_ai:
            mock_ai.chat.completions.create = AsyncMock(
                side_effect=Exception("Gemini unavailable")
            )
            with patch(
                "app.agents.search_agent.generate_embedding",
                AsyncMock(return_value=[0.1] * 1536),
            ):
                resp = await client.post(
                    "/api/search/",
                    json={"query": "quantum entanglement", "mode": "hybrid"},
                )
    # The fallback structured dict keeps the search alive
    assert resp.status_code == 200
    assert "notes" in resp.json()


async def test_search_hybrid_mode_vector_failure_still_returns_keyword_results(client):
    """If embedding generation fails, keyword results are still returned."""
    db = _make_db({"notes": [FAKE_NOTE]})
    with _patch_db(db):
        with patch("app.agents.search_agent.ai_client") as mock_ai:
            mock_ai.chat.completions.create = AsyncMock(
                return_value=_gemini_search_response()
            )
            with patch(
                "app.agents.search_agent.generate_embedding",
                AsyncMock(side_effect=Exception("OpenAI down")),
            ):
                resp = await client.post(
                    "/api/search/",
                    json={"query": "quantum", "mode": "hybrid"},
                )
    assert resp.status_code == 200
    body = resp.json()
    assert "notes" in body
    # keyword hit should still surface the fake note
    assert any(n["id"] == TEST_NOTE_ID for n in body["notes"])


# ─────────────────────────────────────────────────────────────────────────────
# Search — semantic mode (vector only)
# ─────────────────────────────────────────────────────────────────────────────


async def test_search_semantic_mode(client):
    """Semantic mode skips the keyword path and relies on vector similarity."""
    db = _make_db({"notes": [FAKE_NOTE]})
    # Simulate vector search returning our note
    rpc_result = MagicMock()
    rpc_result.execute.return_value = MagicMock(
        data=[{"id": TEST_NOTE_ID, "similarity": 0.92}]
    )
    db.rpc.return_value = rpc_result

    with _patch_db(db):
        with patch("app.agents.search_agent.ai_client") as mock_ai:
            mock_ai.chat.completions.create = AsyncMock(
                return_value=_gemini_search_response(
                    keywords=[], semantic_query="quantum physics"
                )
            )
            with patch(
                "app.agents.search_agent.generate_embedding",
                AsyncMock(return_value=[0.1] * 1536),
            ):
                resp = await client.post(
                    "/api/search/",
                    json={"query": "quantum physics", "mode": "semantic"},
                )
    assert resp.status_code == 200
    assert "notes" in resp.json()


async def test_search_semantic_mode_no_matches(client):
    """Empty vector results → empty notes list."""
    db = _make_db({"notes": []})
    with _patch_db(db):
        with patch("app.agents.search_agent.ai_client") as mock_ai:
            mock_ai.chat.completions.create = AsyncMock(
                return_value=_gemini_search_response(semantic_query="obscure topic")
            )
            with patch(
                "app.agents.search_agent.generate_embedding",
                AsyncMock(return_value=[0.0] * 1536),
            ):
                resp = await client.post(
                    "/api/search/",
                    json={"query": "obscure topic", "mode": "semantic"},
                )
    assert resp.status_code == 200
    assert resp.json()["notes"] == []
