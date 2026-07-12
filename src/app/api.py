from typing import Any

from fastapi import APIRouter, status

from app.dependencies import PrincipalDependency, ServiceDependency
from app.schemas import AnswerIn, AnswerOut, DocumentIn, ErrorOut, IngestOut, SearchIn, SearchOut
from app.services import new_request_id

router = APIRouter(prefix="/v1")
PROTECTED_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorOut, "description": "認証情報がない、または形式が不正です。"},
    403: {"model": ErrorOut, "description": "操作または根拠への権限がありません。"},
    422: {"model": ErrorOut, "description": "入力が OpenAPI schema に適合しません。"},
}


@router.post(
    "/documents",
    response_model=IngestOut,
    status_code=status.HTTP_201_CREATED,
    responses=PROTECTED_RESPONSES,
    summary="文書を取り込む",
    operation_id="ingestDocument",
    description="版と ACL を保持して文書を正規化、チャンク化、索引化します。",
)
async def ingest_document(
    body: DocumentIn, service: ServiceDependency, principal: PrincipalDependency
) -> IngestOut:
    return service.ingest(body, principal, new_request_id())


@router.post(
    "/search",
    response_model=SearchOut,
    responses=PROTECTED_RESPONSES,
    summary="認可済み根拠を検索する",
    operation_id="searchEvidence",
    description="ACL hard filter 後に疎密ハイブリッド検索と順位融合を行います。",
)
async def search(
    body: SearchIn, service: ServiceDependency, principal: PrincipalDependency
) -> SearchOut:
    return service.search(body.query, body.top_k, principal, new_request_id())


@router.post(
    "/answers",
    response_model=AnswerOut,
    responses=PROTECTED_RESPONSES,
    summary="引用付き回答を生成する",
    operation_id="generateGroundedAnswer",
    description="認可済み根拠だけで回答し、根拠不足時は明示的に回答を拒否します。",
)
async def answer(
    body: AnswerIn, service: ServiceDependency, principal: PrincipalDependency
) -> AnswerOut:
    return service.answer(body.question, body.top_k, principal, new_request_id())
