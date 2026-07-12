from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings with explicit, environment-backed defaults."""

    model_config = SettingsConfigDict(env_prefix="RAG_", env_file=".env", extra="ignore")

    app_name: str = "RAG Engineering API"
    environment: str = "local"
    chunk_size_chars: int = Field(default=700, ge=100, le=4000)
    chunk_overlap_chars: int = Field(default=100, ge=0, le=1000)
    evidence_threshold: float = Field(default=0.02, ge=0, le=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
