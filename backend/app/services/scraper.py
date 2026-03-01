"""Webpage scraping and content extraction.

Fetches a URL, strips HTML, and returns the main textual content suitable for
LLM summarisation.  Uses httpx (already in deps) + BeautifulSoup4.
"""

import logging
import re

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

_MAX_CONTENT_CHARS = 12_000  # keep within model context limits

# Tags whose content is noise (scripts, styles, nav, etc.)
_STRIP_TAGS = {
    "script", "style", "nav", "footer", "header", "aside",
    "noscript", "iframe", "svg", "form", "button",
}


async def scrape_url(url: str, *, timeout: float = 15) -> str:
    """Fetch *url* and return the page's visible text content.

    Returns an empty string on failure so callers can fall back gracefully.
    """
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; ClairBot/1.0; "
                    "+https://github.com/clair-notes)"
                )
            },
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
    except Exception as exc:
        log.warning("scraper: failed to fetch %s: %s", url, exc)
        return ""

    return extract_text(html)


def extract_text(html: str) -> str:
    """Strip HTML and return clean, readable text."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove noisy elements
    for tag in soup.find_all(_STRIP_TAGS):
        tag.decompose()

    # Try to narrow to <article> or <main> if present
    body = soup.find("article") or soup.find("main") or soup.body or soup
    text = body.get_text(separator="\n", strip=True)

    # Collapse excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)

    return text[:_MAX_CONTENT_CHARS].strip()
