from fastapi import APIRouter

from app.apis.answers.generate_grounded_answer import functions as api_functions
from app.apis.answers.generate_grounded_answer.samples import ANSWER_RESPONSE_SAMPLE
from app.apis.answers.generate_grounded_answer.schemas import AnswerIn, AnswerOut
from app.apis.base import PROTECTED_RESPONSES
from app.dependencies import (
    AnswerGeneratorDependency,
    ChunkStoreDependency,
    EmbedderDependency,
    PrincipalDependency,
    SettingsDependency,
)
from app.integrations.rag_runtime import new_request_id

router = APIRouter()


@router.post(
    "/v1/answers",
    response_model=AnswerOut,
    responses={
        200: {
            "description": "引用付き回答または根拠不足を返します。",
            "content": {"application/json": {"example": ANSWER_RESPONSE_SAMPLE.model_dump()}},
        },
        **PROTECTED_RESPONSES,
    },
    summary="引用付き回答を生成する",
    operation_id="generateGroundedAnswer",
    description="認可済み根拠だけで回答し、根拠不足時は明示的に回答を拒否します。",
    tags=["answers"],
)
async def generate_grounded_answer(
    body: AnswerIn,
    settings: SettingsDependency,
    embedder: EmbedderDependency,
    chunk_store: ChunkStoreDependency,
    answer_generator: AnswerGeneratorDependency,
    principal: PrincipalDependency,
) -> AnswerOut:
    request_id = new_request_id()
    question = await api_functions.normalize_question(body.question)
    question_embedding = await api_functions.embed_question(question, embedder)
    ranked = await api_functions.retrieve_answer_evidence(
        question, question_embedding, body.top_k, principal, chunk_store
    )
    evidence = await api_functions.select_sufficient_evidence(ranked, settings)
    answer = (
        await api_functions.generate_answer(question, evidence, answer_generator)
        if evidence
        else None
    )
    return await api_functions.build_answer_response(answer, evidence, principal, request_id)
