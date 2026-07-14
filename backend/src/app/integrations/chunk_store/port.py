from typing import Protocol

from app.domain import Chunk, Principal, RankedChunk


class ChunkStorePort(Protocol):
    """認可metadataを保持するRAG data store境界です。"""

    def replace_document(self, document_id: str, chunks: tuple[Chunk, ...]) -> None: ...

    def search(
        self,
        *,
        principal: Principal,
        query: str,
        query_embedding: tuple[float, ...],
        limit: int,
    ) -> tuple[RankedChunk, ...]: ...
