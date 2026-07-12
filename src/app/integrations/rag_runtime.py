import re
import uuid

from app.core.config import Settings
from app.domain import Chunk, Principal, RankedChunk
from app.ports import AnswerGenerator, ChunkStore, Embedder


class RagRuntime:
    """Operation functionsから利用するRAG provider境界です。"""

    def __init__(
        self,
        *,
        settings: Settings,
        store: ChunkStore,
        embedder: Embedder,
        generator: AnswerGenerator,
    ) -> None:
        self._settings = settings
        self._store = store
        self._embedder = embedder
        self._generator = generator

    def retrieve(self, *, query: str, top_k: int, actor: Principal) -> tuple[RankedChunk, ...]:
        normalized = " ".join(query.split())
        return self._store.search(
            principal=actor,
            query=normalized,
            query_embedding=self._embedder.embed(normalized),
            limit=top_k,
        )

    def embed(self, text: str) -> tuple[float, ...]:
        return self._embedder.embed(text)

    def replace_document(self, document_id: str, chunks: tuple[Chunk, ...]) -> None:
        self._store.replace_document(document_id, chunks)

    def generate(self, question: str, evidence: tuple[RankedChunk, ...]) -> str:
        return self._generator.generate(question, evidence)

    @property
    def evidence_threshold(self) -> float:
        return self._settings.evidence_threshold

    def chunk(self, text: str) -> tuple[str, ...]:
        normalized = "\n".join(line.strip() for line in text.splitlines() if line.strip())
        if not normalized:
            raise ValueError("document text is empty after normalization")
        size = self._settings.chunk_size_chars
        overlap = min(self._settings.chunk_overlap_chars, size - 1)
        paragraphs = [part.strip() for part in re.split(r"\n{2,}", normalized) if part.strip()]
        chunks: list[str] = []
        current = ""
        for paragraph in paragraphs:
            if current and len(current) + len(paragraph) + 2 > size:
                chunks.append(current)
                current = current[-overlap:] + "\n\n" + paragraph if overlap else paragraph
            else:
                current = f"{current}\n\n{paragraph}" if current else paragraph
        if current:
            chunks.append(current)
        return tuple(chunks)


def new_request_id() -> str:
    return str(uuid.uuid4())
