# RAG Engineering Workspace

`docs/rag-engineering-guide.pdf` の設計原則を、ローカル検証可能な製品として実装する
モノレポです。バックエンドは FastAPI の port/adapter 構成、フロントエンドは契約駆動、
インフラは AWS CDK を採用します。

## Repository layout

- `backend/`: FastAPI runtime と backend test
- `frontend/`: React/Vite Web と共有 TypeScript contract
- `infra/`: AWS CDK、infra test、Lambda bundle
- `docs/`: REQ/ARC/DES/OPS と実装由来の生成設計
- `tools/`: Python/Node の設計生成器と repository validator

ルートにはモノレポ共通 manifest、lock、Taskfile、CI と作業ガバナンス資産だけを置きます。

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

## Architecture

AWS designは `docs/あーき.drawio` に従い、CloudFront、OACで閉じたS3 SPA、viewer-request
rewrite、regional API Gateway REST API、Lambda/Mangum/FastAPI、Bedrock Knowledge Base +
S3 Vectors、Cognito、AppSync GraphQL subscriptionを接続します。文書取込は `admin` group、
検索と回答は認証利用者に限定し、ACLは検索前filterと取得後再検査の両方へ適用します。

## Local verification

```bash
task setup
task verify
task e2e
```

`task verify` はlint、format、strict typecheck、Python/contract/Web/infra tests、production build、
自動設計drift、skill validation、CDK synthを実行します。`task e2e` はdesktop/mobile browser flowを
実行します。Taskfileと検証用 `ci.yml` にdeploy target/stepはありません。

## Runtime modes

- Local: `RAG_AUTH_MODE=local`, `RAG_STORAGE_BACKEND=local`。Bearer payloadと明示group headerは
  local開発だけで使用します。
- AWS: `RAG_AUTH_MODE=cognito`, `RAG_STORAGE_BACKEND=aws`。Cognito access tokenをAPI Gatewayと
  backendで二重検証し、必要なS3/Knowledge Base/AppSync IDをCDKがLambdaへ注入します。
- Web production: `VITE_AUTH_MODE=cognito` と `.env.example` のCognito/API/AppSync値を
  CloudFormation outputsから設定します。設定不足時にlocalへfallbackしません。

CDKの `synth` とassertionsだけがローカル検証対象です。bootstrap/deployは実行しないでください。

## Continuous delivery

`.github/workflows/deploy.yml` は `main` からの手動実行だけを受け付け、GitHub Environment の
承認後に OIDC short-lived credential で AWS CDK を配備します。locked verification、Environment
設定、初回 stack output に基づく production Web build、最終 output artifact を一つの workflow で
扱います。Environment、OIDC trust、role、variables/secrets の事前設定と実行・復旧手順は
`docs/4_運用_OPS/OPS-004-continuous-delivery.md` を参照してください。
