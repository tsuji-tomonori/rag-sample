from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ApiOperationContract:
    operation_id: str
    method: str
    path: str
    auth_mode: str
    permission: str
    business_summary: str
    sequence: tuple[str, ...]
    test_factors: tuple[str, ...]


OPERATIONS = (
    ApiOperationContract(
        operation_id="ingestDocument",
        method="post",
        path="/v1/documents",
        auth_mode="bearer",
        permission="admin",
        business_summary="ACL metadataを伴う正本文書を正規化・索引化する。",
        sequence=(
            "authenticate",
            "authorize admin",
            "normalize",
            "chunk",
            "embed",
            "store",
            "audit",
        ),
        test_factors=(
            "success",
            "missing token",
            "non-admin",
            "owner impersonation",
            "invalid body",
            "provider failure",
        ),
    ),
    ApiOperationContract(
        operation_id="searchEvidence",
        method="post",
        path="/v1/search",
        auth_mode="bearer",
        permission="authenticated",
        business_summary="ACL hard filter後の根拠候補を順位と診断score付きで返す。",
        sequence=(
            "authenticate",
            "normalize query",
            "ACL filter",
            "retrieve",
            "fuse",
            "deduplicate",
            "audit",
        ),
        test_factors=(
            "success",
            "missing token",
            "empty result",
            "ACL denial",
            "top_k bounds",
            "provider failure",
        ),
    ),
    ApiOperationContract(
        operation_id="generateGroundedAnswer",
        method="post",
        path="/v1/answers",
        auth_mode="bearer",
        permission="authenticated",
        business_summary="認可済み根拠だけから引用付き回答または明示的拒否を返す。",
        sequence=(
            "authenticate",
            "retrieve",
            "evidence gate",
            "generate",
            "attach citations",
            "audit",
        ),
        test_factors=(
            "grounded answer",
            "insufficient evidence",
            "missing token",
            "ACL denial",
            "invalid body",
            "model failure",
        ),
    ),
    ApiOperationContract(
        operation_id="health",
        method="get",
        path="/health",
        auth_mode="public",
        permission="none",
        business_summary="機微情報を含まないprocess死活状態を返す。",
        sequence=("receive", "return status"),
        test_factors=("success",),
    ),
)


MESSAGE_CATALOG = {
    "authentication_required": "Bearer認証情報がない、形式が不正、または検証できない。",
    "access_denied": "認証主体に操作、所有者、group、または根拠への権限がない。",
    "validation_error": "requestがOpenAPI schemaに適合しない。",
    "invalid_operation": "正規化、provider応答、または業務条件が不正。",
    "insufficient_evidence": "閾値以上の認可済み根拠がなく回答を拒否した。",
}
