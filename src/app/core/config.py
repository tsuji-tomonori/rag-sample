from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings with explicit, environment-backed defaults."""

    model_config = SettingsConfigDict(env_prefix="RAG_", env_file=".env", extra="ignore")

    app_name: str = "RAG Engineering API"
    environment: str = "local"
    auth_mode: Literal["local", "cognito"] = "local"
    storage_backend: Literal["local", "aws"] = "local"
    chunk_size_chars: int = Field(default=700, ge=100, le=4000)
    chunk_overlap_chars: int = Field(default=100, ge=0, le=1000)
    evidence_threshold: float = Field(default=0.02, ge=0, le=1)
    aws_region: str = "ap-northeast-1"
    source_bucket: str | None = None
    knowledge_base_id: str | None = None
    data_source_id: str | None = None
    generation_model_id: str = "anthropic.claude-haiku-4-5-20251001-v1:0"
    cognito_user_pool_id: str | None = None
    cognito_client_id: str | None = None

    @model_validator(mode="after")
    def validate_runtime_boundary(self) -> "Settings":
        if self.storage_backend == "aws" and self.auth_mode != "cognito":
            raise ValueError("AWS storage requires Cognito authentication")
        if self.auth_mode == "cognito" and (
            not self.cognito_user_pool_id or not self.cognito_client_id
        ):
            raise ValueError("Cognito authentication settings are incomplete")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
