# DES-001 API 設計

実装 router を正本とし、`uv run app-docs` が `docs/generated/openapi.json` と
`docs/generated/api-list.md` を生成する。エラーは `{error: {code, message, request_id}}`、
成功応答も `request_id` を持つ。保護 API は Bearer subject を必須とする。

