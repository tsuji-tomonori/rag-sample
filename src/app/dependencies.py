from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Header, HTTPException

from app.adapters.local import ExtractiveAnswerGenerator, HashingEmbedder, InMemoryChunkStore
from app.core.config import get_settings
from app.domain import Principal
from app.services import RagService


@lru_cache
def get_cached_service() -> RagService:
    return RagService(
        settings=get_settings(),
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
