from fastapi import APIRouter

from app.apis.system.health import functions as api_functions
from app.apis.system.health.samples import HEALTH_RESPONSE_SAMPLE
from app.apis.system.health.schemas import HealthOut

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthOut,
    responses={
        200: {
            "description": "processは応答可能です。",
            "content": {"application/json": {"example": HEALTH_RESPONSE_SAMPLE.model_dump()}},
        }
    },
    tags=["system"],
    summary="死活状態を取得する",
    operation_id="health",
    description="機微情報を返さずAPI processの死活だけを返します。",
)
async def health() -> HealthOut:
    return await api_functions.build_health_response()
