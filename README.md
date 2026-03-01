# Clair

An AI-powered search engine for your ideas.

## Quick Start

1. **Clone the repo**
   ```bash
   git clone <repo-url> && cd clair
   ```

2. **Copy env files**
   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   # Fill in your Supabase, Anthropic, and OpenAI keys
   ```

3. **Start the frontend**
   ```bash
   cd frontend && npm install && npm run dev
   # Runs on http://localhost:5173
   ```

4. **Start the backend (Redis + FastAPI + Celery worker)**
   ```bash
   docker compose up
   # API runs on http://localhost:8000
   # Docs at http://localhost:8000/docs
   ```

5. **Run the Supabase migration**
   - Open your Supabase project dashboard → SQL Editor
   - Paste and run the contents of `shared/supabase_migration.sql`

---

## Team Split

| Area | Location | Owner |
|------|----------|-------|
| Frontend (React + Vite) | `frontend/` | Frontend dev |
| Backend (FastAPI + Celery) | `backend/` | Backend dev |
| AI Agents | `backend/app/agents/` | AI/agents dev |

### AI Agents

Three agent stubs are ready to be filled in:

- **`organizer.py`** — Classifies the note, assigns a category, extracts tags, and generates clean `processed_content` using Claude.
- **`researcher.py`** — Finds related videos, articles, and posts and saves them to the `resources` table.
- **`search_agent.py`** — Runs hybrid semantic + keyword search over the user's notes using pgvector.

---

## Architecture

```
frontend/          React + TypeScript + Vite + Tailwind v4 + PWA
backend/           FastAPI + Celery (Redis broker)
shared/            Supabase SQL migration (run once in dashboard)
docker-compose.yml Local dev stack: Redis + API + Celery worker
```

### Key backend routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notes/` | Create note + queue AI processing |
| `GET` | `/api/notes/` | List notes (optional `?category_id=`) |
| `GET` | `/api/notes/{id}` | Fetch a single note |
| `POST` | `/api/search/` | Hybrid search |
| `GET` | `/api/categories/` | List user categories |
