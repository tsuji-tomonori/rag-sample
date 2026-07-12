import re
import uuid

from app.core.config import Settings
from app.core.logging import audit
from app.domain import Chunk, Principal, RankedChunk
from app.ports import AnswerGenerator, ChunkStore, Embedder
from app.schemas import AnswerOut, Citation, DocumentIn, IngestOut, SearchHit, SearchOut


class RagService:
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

    def ingest(self, document: DocumentIn, actor: Principal, request_id: str) -> IngestOut:
        if document.owner_subject != actor.subject:
            raise PermissionError("document owner must match the authenticated subject")
        unknown_groups = set(document.allowed_groups).difference(actor.groups)
        if unknown_groups:
            raise PermissionError("documents can only be shared with the actor's groups")
        parts = self._chunk(document.text)
        chunks = tuple(
            Chunk(
                chunk_id=f"{document.document_id}:{document.version}:{ordinal}",
                document_id=document.document_id,
                version=document.version,
                title=document.title,
                text=text,
                ordinal=ordinal,
                owner_subject=document.owner_subject,
                allowed_groups=frozenset(document.allowed_groups),
                embedding=self._embedder.embed(text),
            )
            for ordinal, text in enumerate(parts)
        )
        self._store.replace_document(document.document_id, chunks)
        audit(
            "document.ingested",
            {
                "request_id": request_id,
                "actor": actor.subject,
                "document_id": document.document_id,
                "version": document.version,
                "chunk_count": len(chunks),
            },
        )
        return IngestOut(
            document_id=document.document_id,
            version=document.version,
            chunk_count=len(chunks),
            request_id=request_id,
        )

    def search(self, query: str, top_k: int, actor: Principal, request_id: str) -> SearchOut:
        ranked = self._retrieve(query=query, top_k=top_k, actor=actor)
        audit(
            "search.completed",
            {"request_id": request_id, "actor": actor.subject, "result_count": len(ranked)},
        )
        return SearchOut(hits=[self._to_hit(item) for item in ranked], request_id=request_id)

    def answer(self, question: str, top_k: int, actor: Principal, request_id: str) -> AnswerOut:
        ranked = self._retrieve(query=question, top_k=top_k, actor=actor)
        relevant = tuple(
            item
            for item in ranked
            if max(item.sparse_score, item.dense_score) >= self._settings.evidence_threshold
        )
        if not relevant:
            output = AnswerOut(
                status="insufficient_evidence",
                answer="根拠となる資料を確認できないため回答できません。",
                citations=[],
                request_id=request_id,
            )
        else:
            output = AnswerOut(
                status="answered",
                answer=self._generator.generate(question, relevant),
                citations=[
                    Citation(
                        document_id=item.chunk.document_id,
                        chunk_id=item.chunk.chunk_id,
                        title=item.chunk.title,
                        source_text=item.chunk.text,
                        rank=item.rank,
                        score=item.fused_score,
                    )
                    for item in relevant
                ],
                request_id=request_id,
            )
        audit(
            "answer.completed",
            {
                "request_id": request_id,
                "actor": actor.subject,
                "status": output.status,
                "citation_count": len(output.citations),
            },
        )
        return output

    def _retrieve(self, *, query: str, top_k: int, actor: Principal) -> tuple[RankedChunk, ...]:
        normalized = " ".join(query.split())
        return self._store.search(
            principal=actor,
            query=normalized,
            query_embedding=self._embedder.embed(normalized),
            limit=top_k,
        )

    def _chunk(self, text: str) -> tuple[str, ...]:
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

    @staticmethod
    def _to_hit(item: RankedChunk) -> SearchHit:
        return SearchHit(
            document_id=item.chunk.document_id,
            chunk_id=item.chunk.chunk_id,
            title=item.chunk.title,
            text=item.chunk.text,
            rank=item.rank,
            sparse_score=item.sparse_score,
            dense_score=item.dense_score,
            fused_score=item.fused_score,
        )


def new_request_id() -> str:
    return str(uuid.uuid4())
