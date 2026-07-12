from typing import Protocol

from app.domain import Chunk, Principal, RankedChunk


class Embedder(Protocol):
    def embed(self, text: str) -> tuple[float, ...]: ...


class ChunkStore(Protocol):
    def replace_document(self, document_id: str, chunks: tuple[Chunk, ...]) -> None: ...

    def search(
        self, *, principal: Principal, query: str, query_embedding: tuple[float, ...], limit: int
    ) -> tuple[RankedChunk, ...]: ...


class AnswerGenerator(Protocol):
    def generate(self, question: str, evidence: tuple[RankedChunk, ...]) -> str: ...
