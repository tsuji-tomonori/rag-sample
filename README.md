# RAG Engineering Workspace

`docs/rag-engineering-guide.pdf` の設計原則を、ローカル検証可能な製品として実装する
モノレポです。バックエンドは FastAPI の port/adapter 構成、フロントエンドは契約駆動、
インフラは AWS CDK を採用します。

## 現在のローカル API

```bash
uv sync --all-groups
uv run uvicorn app.main:app --reload
```

- `POST /v1/documents`: ACL と版情報を伴う文書取込
- `POST /v1/search`: ACL 適用済みハイブリッド検索
- `POST /v1/answers`: 引用付き回答、または根拠不足による回答拒否
- `GET /health`: 非機微な死活確認

認証済み利用者はローカルでは `Authorization: Bearer <subject>` と
`X-Principal-Groups: group-a,group-b` で表現します。これは開発用 adapter であり、未指定時に
匿名利用者へ降格する fallback はありません。

## 設計生成

```bash
uv run app-docs
uv run app-docs --check
```

OpenAPI と API 一覧を同じ実行時 router から生成し、設計と実装の drift を検出します。

