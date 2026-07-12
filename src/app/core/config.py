from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings with explicit, environment-backed defaults."""

    model_config = SettingsConfigDict(env_prefix="RAG_", env_file=".env", extra="ignore")

    app_name: str = "RAG Engineering API"
    environment: str = "local"
    storage_backend: Literal["local", "aws"] = "local"
    chunk_size_chars: int = Field(default=700, ge=100, le=4000)
    chunk_overlap_chars: int = Field(default=100, ge=0, le=1000)
    evidence_threshold: float = Field(default=0.02, ge=0, le=1)
    aws_region: str = "ap-northeast-1"
    source_bucket: str | None = None
    knowledge_base_id: str | None = None
    data_source_id: str | None = None
    generation_model_id: str = "anthropic.claude-haiku-4-5-20251001-v1:0"


@lru_cache
def get_settings() -> Settings:
    return Settings()
