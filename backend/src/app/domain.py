from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Principal:
    subject: str
    groups: frozenset[str]


@dataclass(frozen=True, slots=True)
class Chunk:
    chunk_id: str
    document_id: str
    version: str
    title: str
    text: str
    ordinal: int
    owner_subject: str
    allowed_groups: frozenset[str]
    embedding: tuple[float, ...]


@dataclass(frozen=True, slots=True)
class RankedChunk:
    chunk: Chunk
    sparse_score: float
    dense_score: float
    fused_score: float
    rank: int
