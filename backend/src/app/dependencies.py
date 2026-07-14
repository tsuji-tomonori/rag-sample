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
from app.core.config import Settings, get_settings
from app.domain import Principal
from app.integrations.answer_generator.port import AnswerGeneratorPort
from app.integrations.chunk_store.port import ChunkStorePort
from app.integrations.embedder.port import EmbedderPort
from app.integrations.rag_runtime import RagResources


@lru_cache
def get_cached_service() -> RagResources:
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
        return RagResources(
            settings=settings,
            chunk_store=store,
            embedder=HashingEmbedder(),
            answer_generator=generator,
        )
    return RagResources(
        settings=settings,
        chunk_store=InMemoryChunkStore(),
        embedder=HashingEmbedder(),
        answer_generator=ExtractiveAnswerGenerator(),
    )


async def get_service() -> RagResources:
    return get_cached_service()


async def get_chunk_store() -> ChunkStorePort:
    return get_cached_service().chunk_store


async def get_embedder() -> EmbedderPort:
    return get_cached_service().embedder


async def get_answer_generator() -> AnswerGeneratorPort:
    return get_cached_service().answer_generator


async def get_runtime_settings() -> Settings:
    return get_cached_service().settings


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


ServiceDependency = Annotated[RagResources, Depends(get_service)]
PrincipalDependency = Annotated[Principal, Depends(get_principal)]
ChunkStoreDependency = Annotated[ChunkStorePort, Depends(get_chunk_store)]
EmbedderDependency = Annotated[EmbedderPort, Depends(get_embedder)]
AnswerGeneratorDependency = Annotated[AnswerGeneratorPort, Depends(get_answer_generator)]
SettingsDependency = Annotated[Settings, Depends(get_runtime_settings)]
