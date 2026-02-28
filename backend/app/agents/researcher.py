"""Agent 2 — Researcher

Runs after the Organizer, on a rate-limited Celery task (10/min).

Given the processed note, it:
  1. Extracts targeted search queries via Featherless LLM
  2. Fetches resources appropriate to the note type:
       text / voice  →  YouTube (Data API v3) + Wikipedia
       link          →  DuckDuckGo web search for similar pages
       image         →  DuckDuckGo web search based on processed_content
  3. Saves results to the `resources` table in Supabase

Set YOUTUBE_API_KEY in .env to enable YouTube search; it is silently skipped
when the key is absent.
"""

import asyncio
import logging

import httpx
from duckduckgo_search import DDGS

from app.config import settings
from app.services.ai_client import ai_client
from app.services.supabase import supabase
from app.utils import parse_llm_json

log = logging.getLogger(__name__)

_QUERY_SYSTEM_PROMPT = """\
You are a research assistant. Extract targeted search queries from the note below \
to find high-quality external resources. Respond with a single JSON object only.

Required keys:
{
  "youtube_query":  "short query for YouTube video search (3-6 words)",
  "wiki_topic":     "Wikipedia topic or search phrase",
  "web_query":      "web search query for finding similar or related pages"
}
"""


async def research_note(note_id: str) -> None:
    """Find and attach external resources to a note."""

    # ── 1. Fetch the note ────────────────────────────────────────────────────
    note_res = await asyncio.to_thread(
        lambda: supabase.table("notes")
        .select("id, user_id, raw_content, processed_content, content_type, source_url")
        .eq("id", note_id)
        .single()
        .execute()
    )
    note = note_res.data
    if not note:
        return

    content = note.get("processed_content") or note.get("raw_content") or ""
    if not content.strip():
        return

    # ── 2. Extract search queries via LLM ────────────────────────────────────
    try:
        qr = await ai_client.chat.completions.create(
            model=settings.FEATHERLESS_MODEL,
            messages=[
                {"role": "system", "content": _QUERY_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Note type: {note['content_type']}\n\n{content[:2000]}",
                },
            ],
            temperature=0.2,
            max_tokens=200,
        )
        queries = parse_llm_json(qr.choices[0].message.content)
    except Exception as exc:
        log.error("researcher: query extraction failed for %s: %s", note_id, exc)
        return

    # ── 3. Gather resources based on content type ────────────────────────────
    resources: list[dict] = []
    content_type: str = note["content_type"]

    if content_type in ("text", "voice"):
        # Class-note style: YouTube + Wikipedia
        if settings.YOUTUBE_API_KEY:
            yt = await _search_youtube(queries.get("youtube_query", content[:60]))
            resources.extend(yt)
        wiki = await _search_wikipedia(queries.get("wiki_topic", content[:60]))
        resources.extend(wiki)

    elif content_type == "link":
        # Pasted link: find similar pages
        web = await _search_web(
            queries.get("web_query", note.get("source_url") or content[:80])
        )
        resources.extend(web)

    else:
        # image or unknown: web search on processed content
        web = await _search_web(queries.get("web_query", content[:80]))
        resources.extend(web)

    if not resources:
        return

    # ── 4. Save to Supabase ──────────────────────────────────────────────────
    rows = [{"note_id": note_id, **r} for r in resources]
    try:
        await asyncio.to_thread(
            lambda: supabase.table("resources").insert(rows).execute()
        )
        log.info("researcher: saved %d resources for note %s", len(rows), note_id)
    except Exception as exc:
        log.error("researcher: failed to save resources for %s: %s", note_id, exc)


# ── Search helpers ────────────────────────────────────────────────────────────


async def _search_youtube(query: str, max_results: int = 3) -> list[dict]:
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "key": settings.YOUTUBE_API_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        return [
            {
                "title": item["snippet"]["title"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                "resource_type": "video",
            }
            for item in data.get("items", [])
            if item.get("id", {}).get("videoId")
        ]
    except Exception as exc:
        log.warning("researcher: YouTube search failed: %s", exc)
        return []


async def _search_wikipedia(query: str, max_results: int = 2) -> list[dict]:
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "opensearch",
        "search": query,
        "limit": max_results,
        "namespace": 0,
        "format": "json",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            _, titles, _, urls = resp.json()
        return [
            {"title": t, "url": u, "resource_type": "article"}
            for t, u in zip(titles, urls)
            if u
        ]
    except Exception as exc:
        log.warning("researcher: Wikipedia search failed: %s", exc)
        return []


async def _search_web(query: str, max_results: int = 4) -> list[dict]:
    try:
        results = await asyncio.to_thread(
            lambda: list(DDGS().text(query, max_results=max_results))
        )
        return [
            {
                "title": r["title"],
                "url": r["href"],
                "resource_type": "article",
            }
            for r in results
            if r.get("href")
        ]
    except Exception as exc:
        log.warning("researcher: DuckDuckGo search failed: %s", exc)
        return []
