from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"          # default for all agents

    # Per-agent model overrides — fall back to GEMINI_MODEL if unset
    ORGANIZER_MODEL: str = ""   # Agent 1: classify, tag, summarise, assign category
    RESEARCHER_MODEL: str = ""  # Agent 2: extract search queries from a note
    SEARCH_MODEL: str = ""      # Agent 3: interpret natural-language search queries

    @property
    def organizer_model(self) -> str:
        return self.ORGANIZER_MODEL or self.GEMINI_MODEL

    @property
    def researcher_model(self) -> str:
        return self.RESEARCHER_MODEL or self.GEMINI_MODEL

    @property
    def search_model(self) -> str:
        return self.SEARCH_MODEL or self.GEMINI_MODEL
    OPENAI_API_KEY: str = ""  # Whisper transcription + text-embedding-3-small
    YOUTUBE_API_KEY: str = ""  # YouTube Data API v3; researcher skips YouTube if unset
    REDIS_URL: str = "redis://localhost:6379/0"


settings = Settings()
