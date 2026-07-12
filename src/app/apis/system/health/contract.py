from app.apis.contract import ApiContract, MessageContract

CONTRACT = ApiContract(
    operation_id="health",
    markdown_slug="system/health",
    method="GET",
    path="/health",
    summary="死活状態を取得する",
    description="機微情報を返さずAPI processの死活だけを返します。",
    auth_mode="public",
    business_summary="機微情報を含まないprocess死活状態を返す。",
    permissions=(),
    sequence=("build_health_response",),
    prerequisites=(),
    resource_changes=(),
    response_sources=(("status", "Application constant"),),
    test_factors=("正常応答",),
    messages=(
        MessageContract(
            "M001",
            "health.completed",
            "DEBUG",
            "死活応答を返した。",
            "health endpointを呼び出した場合。",
            "継続的な失敗時はLambdaとAPI Gatewayを確認する。",
            "RUNBOOK-health-check",
            ("traceId", "statusCode"),
        ),
    ),
    sql_summary="API processの死活確認境界を仕様化する。",
    sql_tables=("api_process",),
)
