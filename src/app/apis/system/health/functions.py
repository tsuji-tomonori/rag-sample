from app.apis.system.health.schemas import HealthOut
from app.core.logging import audit


async def build_health_response() -> HealthOut:
    """機微情報を含まないprocess死活応答を組み立てる。"""
    audit("health.completed", {"status": "ok"})
    return HealthOut(status="ok")
