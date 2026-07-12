from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import get_cached_service
from app.main import app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    get_cached_service.cache_clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


@pytest.fixture
def auth() -> dict[str, str]:
    return {"Authorization": "Bearer alice", "X-Principal-Groups": "support"}
