from functools import lru_cache
from typing import Annotated, cast

from fastapi import Depends, Header, HTTPException

from app.adapters.aws import AwsKnowledgeBaseConfig, create_aws_adapters
from app.adapters.local import ExtractiveAnswerGenerator, HashingEmbedder, InMemoryChunkStore
from app.auth import (
    AuthenticationFailedError,
    Authenticator,
    CognitoAuthenticator,
    CognitoAuthenticatorConfig,
    LocalAuthenticator,
)
from app.core.config import get_settings
from app.domain import Principal
from app.integrations.rag_runtime import RagRuntime


@lru_cache
def get_cached_service() -> RagRuntime:
    settings = get_settings()
    if settings.storage_backend == "aws":
        required = {
            "source_bucket": settings.source_bucket,
            "knowledge_base_id": settings.knowledge_base_id,
            "data_source_id": settings.data_source_id,
            "appsync_graphql_url": settings.appsync_graphql_url,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError("AWS backend settings are missing: " + ", ".join(missing))
        store, generator = create_aws_adapters(
            AwsKnowledgeBaseConfig(
                region=settings.aws_region,
                source_bucket=cast(str, settings.source_bucket),
                knowledge_base_id=cast(str, settings.knowledge_base_id),
                data_source_id=cast(str, settings.data_source_id),
                generation_model_id=settings.generation_model_id,
                appsync_graphql_url=cast(str, settings.appsync_graphql_url),
            )
        )
        return RagRuntime(
            settings=settings,
            store=store,
            embedder=HashingEmbedder(),
            generator=generator,
        )
    return RagRuntime(
        settings=settings,
        store=InMemoryChunkStore(),
        embedder=HashingEmbedder(),
        generator=ExtractiveAnswerGenerator(),
    )


async def get_service() -> RagRuntime:
    return get_cached_service()


@lru_cache
def get_cached_authenticator() -> Authenticator:
    settings = get_settings()
    if settings.auth_mode == "local":
        return LocalAuthenticator()
    return CognitoAuthenticator(
        CognitoAuthenticatorConfig(
            region=settings.aws_region,
            user_pool_id=cast(str, settings.cognito_user_pool_id),
            client_id=cast(str, settings.cognito_client_id),
        )
    )


async def get_authenticator() -> Authenticator:
    return get_cached_authenticator()


async def get_principal(
    authenticator: Annotated[Authenticator, Depends(get_authenticator)],
    authorization: Annotated[str | None, Header()] = None,
    x_principal_groups: Annotated[str | None, Header()] = None,
) -> Principal:
    scheme, separator, subject = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not separator or not subject.strip():
        raise HTTPException(status_code=401, detail="Bearer authentication is required")
    asserted_groups = frozenset(
        group.strip() for group in (x_principal_groups or "").split(",") if group.strip()
    )
    try:
        return authenticator.authenticate(subject.strip(), asserted_groups)
    except AuthenticationFailedError as exc:
        raise HTTPException(status_code=401, detail="Bearer credential is invalid") from exc


ServiceDependency = Annotated[RagRuntime, Depends(get_service)]
PrincipalDependency = Annotated[Principal, Depends(get_principal)]
