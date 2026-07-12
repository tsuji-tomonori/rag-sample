import hashlib
import math
import re
from collections import Counter

from app.domain import Chunk, Principal, RankedChunk

_TOKEN = re.compile(r"[\w\-]+", re.UNICODE)


def tokenize(text: str) -> tuple[str, ...]:
    return tuple(token.lower() for token in _TOKEN.findall(text))


class HashingEmbedder:
    """Deterministic local embedder for verification, never a production fallback."""

    def __init__(self, dimensions: int = 384) -> None:
        self._dimensions = dimensions

    def embed(self, text: str) -> tuple[float, ...]:
        values = [0.0] * self._dimensions
        for token in tokenize(text):
            digest = hashlib.sha256(token.encode()).digest()
            index = int.from_bytes(digest[:4]) % self._dimensions
            values[index] += 1.0 if digest[4] & 1 else -1.0
        norm = math.sqrt(sum(value * value for value in values))
        return tuple(value / norm for value in values) if norm else tuple(values)


class InMemoryChunkStore:
    def __init__(self) -> None:
        self._chunks: dict[str, Chunk] = {}

    def replace_document(self, document_id: str, chunks: tuple[Chunk, ...]) -> None:
        self._chunks = {
            chunk_id: chunk
            for chunk_id, chunk in self._chunks.items()
            if chunk.document_id != document_id
        }
        self._chunks.update({chunk.chunk_id: chunk for chunk in chunks})

    def search(
        self, *, principal: Principal, query: str, query_embedding: tuple[float, ...], limit: int
    ) -> tuple[RankedChunk, ...]:
        # Authorization is deliberately evaluated before either retrieval channel.
        authorized = [
            chunk
            for chunk in self._chunks.values()
            if chunk.owner_subject == principal.subject
            or bool(chunk.allowed_groups.intersection(principal.groups))
        ]
        query_terms = Counter(tokenize(query))
        sparse = {
            chunk.chunk_id: self._sparse_score(query_terms, Counter(tokenize(chunk.text)))
            for chunk in authorized
        }
        dense = {
            chunk.chunk_id: sum(
                a * b for a, b in zip(query_embedding, chunk.embedding, strict=True)
            )
            for chunk in authorized
        }
        sparse_order = sorted(authorized, key=lambda item: (-sparse[item.chunk_id], item.chunk_id))
        dense_order = sorted(authorized, key=lambda item: (-dense[item.chunk_id], item.chunk_id))
        sparse_rank = {chunk.chunk_id: rank for rank, chunk in enumerate(sparse_order, start=1)}
        dense_rank = {chunk.chunk_id: rank for rank, chunk in enumerate(dense_order, start=1)}
        fused = {
            chunk.chunk_id: 1 / (60 + sparse_rank[chunk.chunk_id])
            + 1 / (60 + dense_rank[chunk.chunk_id])
            for chunk in authorized
        }
        ordered = sorted(authorized, key=lambda item: (-fused[item.chunk_id], item.chunk_id))
        deduplicated: list[Chunk] = []
        seen: set[str] = set()
        for chunk in ordered:
            fingerprint = hashlib.sha256(" ".join(tokenize(chunk.text)).encode()).hexdigest()
            if fingerprint not in seen:
                seen.add(fingerprint)
                deduplicated.append(chunk)
        return tuple(
            RankedChunk(
                chunk=chunk,
                sparse_score=sparse[chunk.chunk_id],
                dense_score=max(0.0, dense[chunk.chunk_id]),
                fused_score=fused[chunk.chunk_id],
                rank=rank,
            )
            for rank, chunk in enumerate(deduplicated[:limit], start=1)
        )

    @staticmethod
    def _sparse_score(query: Counter[str], document: Counter[str]) -> float:
        if not query or not document:
            return 0.0
        overlap = sum(min(count, document[token]) for token, count in query.items())
        return overlap / sum(query.values())


class ExtractiveAnswerGenerator:
    """Local generator that only returns verbatim authorized evidence."""

    def generate(self, question: str, evidence: tuple[RankedChunk, ...]) -> str:
        del question
        return "\n\n".join(item.chunk.text for item in evidence[:3])
