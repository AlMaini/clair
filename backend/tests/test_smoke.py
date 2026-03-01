"""
backend/tests/test_smoke.py

Smoke / integration test — exercises the full note lifecycle against real
external services: Supabase, Gemini (organizer), and OpenAI (embeddings).

Prerequisites
─────────────
1. All variables set in backend/.env:
       SUPABASE_URL, SUPABASE_KEY (service_role), GEMINI_API_KEY, OPENAI_API_KEY
2. The match_notes RPC function deployed in your Supabase project.
   Run the following SQL once in the Supabase SQL editor:

       create or replace function match_notes(
         query_embedding vector(1536),
         match_threshold float,
         match_count int,
         p_user_id uuid
       )
       returns table (id uuid, similarity float)
       language sql stable as $$
         select id, 1 - (embedding <=> query_embedding) as similarity
         from notes
         where user_id = p_user_id
           and embedding is not null
           and 1 - (embedding <=> query_embedding) > match_threshold
         order by embedding <=> query_embedding
         limit match_count;
       $$;

Run
───
    cd backend
    uv run pytest tests/test_smoke.py -v -s

What this test does
───────────────────
  1. Creates a temporary Supabase auth user (deleted on teardown)
  2. POSTs a note through the FastAPI app → lands in Supabase
  3. Calls the Gemini organizer agent directly → writes title/tags/category back
  4. Generates an OpenAI embedding and stores it in the notes.embedding column
  5. Runs a semantic search via the API → asserts the note is returned
  6. Deletes the note and the auth user (cascade wipes categories too)
"""

from __future__ import annotations

import asyncio
import uuid
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import get_user_id
from app.main import app
from app.services.supabase import supabase


# ─────────────────────────────────────────────────────────────────────────────
# Auth-user fixture
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
async def smoke_user():
    """Create a real Supabase auth user, yield its UUID, delete on teardown.

    Deletion cascades to notes and categories via ON DELETE CASCADE, so no
    manual cleanup of child rows is needed.
    """
    email = f"smoke-{uuid.uuid4()}@test.local"
    user_resp = supabase.auth.admin.create_user(
        {"email": email, "password": "SmokeTest1234!", "email_confirm": True}
    )
    user_id = str(user_resp.user.id)
    print(f"\n[smoke] created auth user {user_id} ({email})")

    app.dependency_overrides[get_user_id] = lambda: user_id
    yield user_id

    app.dependency_overrides.clear()
    supabase.auth.admin.delete_user(user_id)
    print(f"[smoke] deleted auth user {user_id}")


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ─────────────────────────────────────────────────────────────────────────────
# Smoke test
# ─────────────────────────────────────────────────────────────────────────────


async def test_note_lifecycle(smoke_user, client):
    user_id = smoke_user

    note_content = (
        "Python is a high-level, dynamically typed programming language. "
        "It is widely used in data science, machine learning, and web development "
        "due to its clean syntax and extensive library ecosystem including "
        "NumPy, Pandas, scikit-learn, and PyTorch."
    )

    # ── 1. Create the note ────────────────────────────────────────────────────
    # Patch process_note.delay so the router doesn't try to connect to Redis.
    # We invoke the AI pipeline directly in steps 3-4 below.
    print("\n── Step 1: create note ──")
    with patch("app.worker.process_note") as mock_task:
        mock_task.delay = MagicMock()
        create_resp = await client.post(
            "/api/notes/",
            data={"content_type": "text", "content": note_content},
        )
    assert create_resp.status_code == 201, create_resp.text
    note_id = create_resp.json()["id"]
    print(f"  note_id = {note_id}")

    # ── 2. Verify it landed in Supabase ───────────────────────────────────────
    print("── Step 2: verify in Supabase ──")
    get_resp = await client.get(f"/api/notes/{note_id}")
    assert get_resp.status_code == 200
    raw = get_resp.json()["raw_content"]
    assert raw == note_content
    print(f"  raw_content present ({len(raw)} chars)")

    # ── 3. Run the Gemini organizer agent ─────────────────────────────────────
    print("── Step 3: run Gemini organizer ──")
    from app.agents.organizer import organize_note
    await organize_note(note_id)

    get_resp = await client.get(f"/api/notes/{note_id}")
    assert get_resp.status_code == 200
    body = get_resp.json()

    assert body["processed_content"], "organizer must write a summary"
    assert body["tags"], "organizer must extract tags"
    print(f"  summary  : {body['processed_content']}")
    print(f"  tags     : {body['tags']}")
    category = body.get("category") or {}
    print(f"  category : {category.get('name', '(none)')}")

    # ── 4. Generate + store embedding ─────────────────────────────────────────
    print("── Step 4: generate OpenAI embedding ──")
    from app.services.embeddings import generate_embedding

    text_to_embed = body["processed_content"] or body["raw_content"]
    embedding = await generate_embedding(text_to_embed)
    assert len(embedding) == 1536

    await asyncio.to_thread(
        lambda: supabase.table("notes")
        .update({"embedding": embedding})
        .eq("id", note_id)
        .execute()
    )
    print(f"  stored {len(embedding)}-dim embedding")

    # ── 5. Semantic search via the API ────────────────────────────────────────
    print("── Step 5: semantic search ──")
    search_resp = await client.post(
        "/api/search/",
        json={"query": "machine learning libraries in Python", "mode": "semantic"},
    )
    assert search_resp.status_code == 200
    result_ids = [n["id"] for n in search_resp.json()["notes"]]
    print(f"  results  : {result_ids}")
    assert note_id in result_ids, (
        f"note {note_id} not found in semantic search results.\n"
        "Make sure the match_notes SQL function is deployed (see file docstring)."
    )
    print(f"  found note in semantic search results ✓")

    # ── 6. Clean up the note (auth user teardown handles the rest) ────────────
    print("── Step 6: delete note ──")
    del_resp = await client.delete(f"/api/notes/{note_id}")
    assert del_resp.status_code == 204
    print(f"  deleted note {note_id}")
