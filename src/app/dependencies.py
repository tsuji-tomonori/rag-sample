from functools import lru_cache
from typing import Annotated, cast

from fastapi import Depends, Header, HTTPException

from app.adapters.aws import AwsKnowledgeBaseConfig, create_aws_adapters
from app.adapters.local import ExtractiveAnswerGenerator, HashingEmbedder, InMemoryChunkStore
from app.core.config import get_settings
from app.domain import Principal
from app.services import RagService


@lru_cache
def get_cached_service() -> RagService:
    settings = get_settings()
    if settings.storage_backend == "aws":
        required = {
            "source_bucket": settings.source_bucket,
            "knowledge_base_id": settings.knowledge_base_id,
            "data_source_id": settings.data_source_id,
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
            )
        )
        return RagService(
            settings=settings,
            store=store,
            embedder=HashingEmbedder(),
            generator=generator,
        )
    return RagService(
        settings=settings,
        store=InMemoryChunkStore(),
        embedder=HashingEmbedder(),
        generator=ExtractiveAnswerGenerator(),
    )


async def get_service() -> RagService:
    return get_cached_service()


async def get_principal(
    authorization: Annotated[str | None, Header()] = None,
    x_principal_groups: Annotated[str | None, Header()] = None,
) -> Principal:
    scheme, separator, subject = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not separator or not subject.strip():
        raise HTTPException(status_code=401, detail="Bearer authentication is required")
    groups = frozenset(
        group.strip() for group in (x_principal_groups or "").split(",") if group.strip()
    )
    return Principal(subject=subject.strip(), groups=groups)


ServiceDependency = Annotated[RagService, Depends(get_service)]
PrincipalDependency = Annotated[Principal, Depends(get_principal)]
