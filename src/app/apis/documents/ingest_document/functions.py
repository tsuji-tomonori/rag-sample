from app.apis.documents.ingest_document.schemas import DocumentIn, IngestOut
from app.core.logging import audit
from app.domain import Chunk, Principal
from app.integrations.rag_runtime import RagRuntime


async def validate_ingestion_permission(document: DocumentIn, actor: Principal) -> None:
    """文書登録権限、所有者、共有groupを検証する。"""
    if "admin" not in actor.groups:
        raise PermissionError("document ingestion requires the admin group")
    if document.owner_subject != actor.subject:
        raise PermissionError("document owner must match the authenticated subject")
    unknown_groups = set(document.allowed_groups).difference(actor.groups)
    if unknown_groups:
        raise PermissionError("documents can only be shared with the actor's groups")


async def normalize_and_chunk_document(
    document: DocumentIn, runtime: RagRuntime
) -> tuple[Chunk, ...]:
    """正本文書を正規化、チャンク化、埋め込み化する。"""
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
            embedding=runtime.embed(text),
        )
        for ordinal, text in enumerate(runtime.chunk(document.text))
    )


async def store_document_chunks(
    document: DocumentIn, chunks: tuple[Chunk, ...], runtime: RagRuntime
) -> None:
    """版置換の単位で認可metadata付きチャンクを保存する。"""
    runtime.replace_document(document.document_id, chunks)


async def build_ingest_response(
    document: DocumentIn, chunks: tuple[Chunk, ...], actor: Principal, request_id: str
) -> IngestOut:
    """監査イベントを記録し登録結果を組み立てる。"""
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
