from app.apis.contract import ApiContract, MessageContract

CONTRACT = ApiContract(
    operation_id="ingestDocument",
    markdown_slug="documents/ingest_document",
    method="POST",
    path="/v1/documents",
    summary="文書を取り込む",
    description="版とACLを保持して文書を正規化、チャンク化、索引化します。",
    auth_mode="management-bearer",
    business_summary="ACL metadataを伴う正本文書を正規化・索引化する。",
    permissions=("admin",),
    response_sources=(
        ("document_id", "Request: document_id"),
        ("version", "Request: version"),
        ("chunk_count", "生成したchunk数"),
        ("request_id", "Application generated UUID"),
    ),
    messages=(
        MessageContract(
            "M001",
            "ingestDocument.permission_denied",
            "WARNING",
            "文書登録の認可を拒否した。",
            "admin、所有者、共有groupの検証に失敗した場合。",
            "認証主体と文書ACLを確認する。",
            "RUNBOOK-authorization-forbidden",
            ("traceId", "actorPrincipalId", "documentId", "errorCode"),
        ),
        MessageContract(
            "M002",
            "ingestDocument.completed",
            "INFO",
            "文書の索引化を開始した。",
            "正規化済みchunkを保存した場合。",
            "ingestion jobの状態を確認する。",
            "RUNBOOK-ingestion-status",
            ("traceId", "actorPrincipalId", "documentId", "chunkCount"),
        ),
    ),
)
