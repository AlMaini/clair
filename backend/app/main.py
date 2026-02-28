from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import notes, search, categories

app = FastAPI(title="Clair API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])


@app.get("/")
async def health_check():
    return {"status": "ok", "service": "clair-api"}
