import pytest

from app.core.config import get_settings
from app.dependencies import get_cached_service


def test_aws_backend_never_falls_back_when_settings_are_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("RAG_STORAGE_BACKEND", "aws")
    monkeypatch.setenv("RAG_AUTH_MODE", "cognito")
    monkeypatch.setenv("RAG_COGNITO_USER_POOL_ID", "pool-1")
    monkeypatch.setenv("RAG_COGNITO_CLIENT_ID", "client-1")
    monkeypatch.delenv("RAG_SOURCE_BUCKET", raising=False)
    monkeypatch.delenv("RAG_KNOWLEDGE_BASE_ID", raising=False)
    monkeypatch.delenv("RAG_DATA_SOURCE_ID", raising=False)
    monkeypatch.delenv("RAG_APPSYNC_GRAPHQL_URL", raising=False)
    get_settings.cache_clear()
    get_cached_service.cache_clear()
    with pytest.raises(ValueError, match="AWS backend settings are missing"):
        get_cached_service()
    get_settings.cache_clear()
    get_cached_service.cache_clear()
