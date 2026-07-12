from app.apis.contract import ApiContract, MessageContract

CONTRACT = ApiContract(
    operation_id="generateGroundedAnswer",
    markdown_slug="answers/generate_grounded_answer",
    method="POST",
    path="/v1/answers",
    summary="引用付き回答を生成する",
    description="認可済み根拠だけで回答し、根拠不足時は明示的に回答を拒否します。",
    auth_mode="management-bearer",
    business_summary="認可済み根拠だけから引用付き回答または明示的拒否を返す。",
    permissions=("authenticated",),
    response_sources=(
        ("status", "Evidence gate result"),
        ("answer", "AnswerGenerator output or fixed abstention message"),
        ("citations", "Authorized evidence chunks"),
        ("request_id", "Application generated UUID"),
    ),
    messages=(
        MessageContract(
            "M001",
            "generateGroundedAnswer.completed",
            "INFO",
            "根拠限定回答処理を完了した。",
            "回答または回答拒否を返却した場合。",
            "statusとcitationCountを確認する。",
            "RUNBOOK-answer-grounding",
            ("traceId", "actorPrincipalId", "status", "citationCount"),
        ),
    ),
)
