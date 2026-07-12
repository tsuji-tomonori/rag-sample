from fastapi import APIRouter, status

from app.apis.base import PROTECTED_RESPONSES
from app.apis.documents.ingest_document import functions as api_functions
from app.apis.documents.ingest_document.samples import INGEST_RESPONSE_SAMPLE
from app.apis.documents.ingest_document.schemas import DocumentIn, IngestOut
from app.dependencies import PrincipalDependency, ServiceDependency
from app.integrations.rag_runtime import new_request_id

router = APIRouter()


@router.post(
    "/v1/documents",
    response_model=IngestOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {
            "description": "文書を索引化しました。",
            "content": {"application/json": {"example": INGEST_RESPONSE_SAMPLE.model_dump()}},
        },
        **PROTECTED_RESPONSES,
    },
    summary="文書を取り込む",
    operation_id="ingestDocument",
    description="版とACLを保持して文書を正規化、チャンク化、索引化します。",
    tags=["documents"],
)
async def ingest_document(
    body: DocumentIn, runtime: ServiceDependency, principal: PrincipalDependency
) -> IngestOut:
    request_id = new_request_id()
    await api_functions.validate_ingestion_permission(body, principal)
    chunks = await api_functions.normalize_and_chunk_document(body, runtime)
    await api_functions.store_document_chunks(body, chunks, runtime)
    return await api_functions.build_ingest_response(body, chunks, principal, request_id)
