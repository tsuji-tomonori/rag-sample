from app.apis.contract import ApiContract, MessageContract

CONTRACT = ApiContract(
    operation_id="searchEvidence",
    markdown_slug="retrieval/search_evidence",
    method="POST",
    path="/v1/search",
    summary="認可済み根拠を検索する",
    description="ACL hard filter後に疎密ハイブリッド検索と順位融合を行います。",
    auth_mode="management-bearer",
    business_summary="認証主体が参照できる根拠だけを疎密検索し、RRF順位で返す。",
    permissions=("authenticated",),
    response_sources=(
        ("hits", "ChunkStore hybrid retrieval result"),
        ("request_id", "Application generated UUID"),
    ),
    messages=(
        MessageContract(
            "M001",
            "searchEvidence.completed",
            "INFO",
            "認可済み根拠の検索を完了した。",
            "検索結果を返却した場合。",
            "resultCountと検索遅延を確認する。",
            "RUNBOOK-retrieval-quality",
            ("traceId", "actorPrincipalId", "resultCount", "durationMs"),
        ),
    ),
)
