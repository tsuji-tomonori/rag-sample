from fastapi import APIRouter

from app.apis.base import PROTECTED_RESPONSES
from app.apis.retrieval.search_evidence import functions as api_functions
from app.apis.retrieval.search_evidence.samples import SEARCH_RESPONSE_SAMPLE
from app.apis.retrieval.search_evidence.schemas import SearchIn, SearchOut
from app.dependencies import ChunkStoreDependency, EmbedderDependency, PrincipalDependency
from app.integrations.rag_runtime import new_request_id

router = APIRouter()


@router.post(
    "/v1/search",
    response_model=SearchOut,
    responses={
        200: {
            "description": "認可済み根拠を返します。",
            "content": {"application/json": {"example": SEARCH_RESPONSE_SAMPLE.model_dump()}},
        },
        **PROTECTED_RESPONSES,
    },
    summary="認可済み根拠を検索する",
    operation_id="searchEvidence",
    description="ACL hard filter後に疎密ハイブリッド検索と順位融合を行います。",
    tags=["retrieval"],
)
async def search_evidence(
    body: SearchIn,
    embedder: EmbedderDependency,
    chunk_store: ChunkStoreDependency,
    principal: PrincipalDependency,
) -> SearchOut:
    request_id = new_request_id()
    normalized_query = await api_functions.normalize_query(body.query)
    query_embedding = await api_functions.embed_query(normalized_query, embedder)
    ranked = await api_functions.retrieve_authorized_evidence(
        normalized_query, query_embedding, body.top_k, principal, chunk_store
    )
    return await api_functions.build_search_response(ranked, principal, request_id)
