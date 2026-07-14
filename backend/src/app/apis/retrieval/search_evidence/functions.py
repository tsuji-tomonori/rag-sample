from app.apis.retrieval.search_evidence.schemas import SearchHit, SearchOut
from app.core.logging import audit
from app.domain import Principal, RankedChunk
from app.integrations.chunk_store.port import ChunkStorePort
from app.integrations.embedder.port import EmbedderPort


async def normalize_query(query: str) -> str:
    """検索語の空白を正規化する。"""
    return " ".join(query.split())


async def embed_query(query: str, embedder: EmbedderPort) -> tuple[float, ...]:
    """疎密hybrid retrieval用のquery embeddingを生成する。"""
    return embedder.embed(query)


async def retrieve_authorized_evidence(
    query: str,
    query_embedding: tuple[float, ...],
    top_k: int,
    actor: Principal,
    chunk_store: ChunkStorePort,
) -> tuple[RankedChunk, ...]:
    """ACL hard filter後に疎密検索とRRFを行う。"""
    return chunk_store.search(
        principal=actor,
        query=query,
        query_embedding=query_embedding,
        limit=top_k,
    )


async def build_search_response(
    ranked: tuple[RankedChunk, ...], actor: Principal, request_id: str
) -> SearchOut:
    """検索診断scoreを含む認可済み根拠一覧を組み立てる。"""
    audit(
        "searchEvidence.completed",
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
