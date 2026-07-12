from app.apis.answers.generate_grounded_answer.schemas import AnswerOut, Citation
from app.core.logging import audit
from app.domain import Principal, RankedChunk
from app.integrations.rag_runtime import RagRuntime


async def retrieve_answer_evidence(
    question: str, top_k: int, actor: Principal, runtime: RagRuntime
) -> tuple[RankedChunk, ...]:
    """回答生成前にACL適用済み根拠を取得する。"""
    return runtime.retrieve(query=" ".join(question.split()), top_k=top_k, actor=actor)


async def select_sufficient_evidence(
    ranked: tuple[RankedChunk, ...], runtime: RagRuntime
) -> tuple[RankedChunk, ...]:
    """疎または密scoreが根拠閾値以上の候補だけを選ぶ。"""
    return tuple(
        item
        for item in ranked
        if max(item.sparse_score, item.dense_score) >= runtime.evidence_threshold
    )


async def generate_answer(
    question: str, evidence: tuple[RankedChunk, ...], runtime: RagRuntime
) -> str:
    """認可・閾値検証済み根拠だけをgeneratorへ渡す。"""
    return runtime.generate(question, evidence)


async def build_answer_response(
    answer: str | None,
    evidence: tuple[RankedChunk, ...],
    actor: Principal,
    request_id: str,
) -> AnswerOut:
    """引用付き回答または明示的な根拠不足応答を組み立てる。"""
    if answer is None:
        output = AnswerOut(
            status="insufficient_evidence",
            answer="根拠となる資料を確認できないため回答できません。",
            citations=[],
            request_id=request_id,
        )
    else:
        output = AnswerOut(
            status="answered",
            answer=answer,
            citations=[
                Citation(
                    document_id=item.chunk.document_id,
                    chunk_id=item.chunk.chunk_id,
                    title=item.chunk.title,
                    source_text=item.chunk.text,
                    rank=item.rank,
                    score=item.fused_score,
                )
                for item in evidence
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
