from fastapi import APIRouter

from app.models.schemas import SearchQuery, SearchResult

router = APIRouter()


@router.post("/", response_model=SearchResult)
async def search_notes(query: SearchQuery):
    """Run a hybrid search over the user's notes."""
    # TODO: delegate to search_agent.semantic_search
    return {"notes": []}
