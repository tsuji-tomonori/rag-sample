from app.apis.retrieval.search_evidence.schemas import SearchHit, SearchOut
from app.core.logging import audit
from app.domain import Principal, RankedChunk
from app.integrations.rag_runtime import RagRuntime


async def normalize_query(query: str) -> str:
    """検索語の空白を正規化する。"""
    return " ".join(query.split())


async def retrieve_authorized_evidence(
    query: str, top_k: int, actor: Principal, runtime: RagRuntime
) -> tuple[RankedChunk, ...]:
    """ACL hard filter後に疎密検索とRRFを行う。"""
    return runtime.retrieve(query=query, top_k=top_k, actor=actor)


async def build_search_response(
    ranked: tuple[RankedChunk, ...], actor: Principal, request_id: str
) -> SearchOut:
    """検索診断scoreを含む認可済み根拠一覧を組み立てる。"""
    audit(
        "search.completed",
        {"request_id": request_id, "actor": actor.subject, "result_count": len(ranked)},
    )
    return SearchOut(
        hits=[
            SearchHit(
                document_id=item.chunk.document_id,
                chunk_id=item.chunk.chunk_id,
                title=item.chunk.title,
                text=item.chunk.text,
                rank=item.rank,
                sparse_score=item.sparse_score,
                dense_score=item.dense_score,
                fused_score=item.fused_score,
            )
            for item in ranked
        ],
        request_id=request_id,
    )
