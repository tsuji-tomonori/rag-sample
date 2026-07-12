import re

from app.apis.documents.ingest_document.schemas import DocumentIn, IngestOut
from app.core.config import Settings
from app.core.logging import audit
from app.domain import Chunk, Principal
from app.integrations.chunk_store.port import ChunkStorePort
from app.integrations.embedder.port import EmbedderPort


async def validate_ingestion_permission(document: DocumentIn, actor: Principal) -> None:
    """文書登録権限、所有者、共有groupを検証する。"""
    if "admin" not in actor.groups:
        audit(
            "ingestDocument.permission_denied",
            {"actor": actor.subject, "document_id": document.document_id, "reason": "admin"},
        )
        raise PermissionError("document ingestion requires the admin group")
    if document.owner_subject != actor.subject:
        audit(
            "ingestDocument.permission_denied",
            {"actor": actor.subject, "document_id": document.document_id, "reason": "owner"},
        )
        raise PermissionError("document owner must match the authenticated subject")
    unknown_groups = set(document.allowed_groups).difference(actor.groups)
    if unknown_groups:
        audit(
            "ingestDocument.permission_denied",
            {"actor": actor.subject, "document_id": document.document_id, "reason": "group"},
        )
        raise PermissionError("documents can only be shared with the actor's groups")


async def normalize_and_chunk_document(document: DocumentIn, settings: Settings) -> tuple[str, ...]:
    """正本文書を正規化し、overlap付きのチャンクへ分割する。"""
    normalized = "\n".join(line.strip() for line in document.text.splitlines() if line.strip())
    if not normalized:
        raise ValueError("document text is empty after normalization")
    size = settings.chunk_size_chars
    overlap = min(settings.chunk_overlap_chars, size - 1)
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


async def embed_document_chunks(
    document: DocumentIn, texts: tuple[str, ...], embedder: EmbedderPort
) -> tuple[Chunk, ...]:
    """各チャンクをembedding化し、ACL metadata付きの索引recordを組み立てる。"""
    return tuple(
        Chunk(
            chunk_id=f"{document.document_id}:{document.version}:{ordinal}",
            document_id=document.document_id,
            version=document.version,
            title=document.title,
            text=text,
            ordinal=ordinal,
            owner_subject=document.owner_subject,
            allowed_groups=frozenset(document.allowed_groups),
            embedding=embedder.embed(text),
        )
        for ordinal, text in enumerate(texts)
    )


async def store_document_chunks(
    document: DocumentIn, chunks: tuple[Chunk, ...], chunk_store: ChunkStorePort
) -> None:
    """版置換の単位で認可metadata付きチャンクを保存する。"""
    chunk_store.replace_document(document.document_id, chunks)


async def build_ingest_response(
    document: DocumentIn, chunks: tuple[Chunk, ...], actor: Principal, request_id: str
) -> IngestOut:
    """監査イベントを記録し登録結果を組み立てる。"""
    audit(
        "ingestDocument.completed",
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
