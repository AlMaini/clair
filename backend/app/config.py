from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    FEATHERLESS_API_KEY: str = ""
    FEATHERLESS_BASE_URL: str = "https://api.featherless.ai/v1"
    FEATHERLESS_MODEL: str = "meta-llama/Llama-3.3-70B-Instruct"
    OPENAI_API_KEY: str = ""  # still used for Whisper transcription
    REDIS_URL: str = "redis://localhost:6379/0"


settings = Settings()
