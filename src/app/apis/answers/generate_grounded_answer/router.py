from fastapi import APIRouter

from app.apis.answers.generate_grounded_answer import functions as api_functions
from app.apis.answers.generate_grounded_answer.samples import ANSWER_RESPONSE_SAMPLE
from app.apis.answers.generate_grounded_answer.schemas import AnswerIn, AnswerOut
from app.apis.base import PROTECTED_RESPONSES
from app.dependencies import PrincipalDependency, ServiceDependency
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
    body: AnswerIn, runtime: ServiceDependency, principal: PrincipalDependency
) -> AnswerOut:
    request_id = new_request_id()
    ranked = await api_functions.retrieve_answer_evidence(
        body.question, body.top_k, principal, runtime
    )
    evidence = await api_functions.select_sufficient_evidence(ranked, runtime)
    answer = (
        await api_functions.generate_answer(body.question, evidence, runtime) if evidence else None
    )
    return await api_functions.build_answer_response(answer, evidence, principal, request_id)
