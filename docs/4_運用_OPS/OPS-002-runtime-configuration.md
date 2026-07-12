---
id: OPS-002
status: confirmed
---
# Runtime configuration

local は `RAG_AUTH_MODE=local`, `RAG_STORAGE_BACKEND=local` を使用する。AWS runtime は CDK が
Cognito user pool/client、S3 source、Knowledge Base/data source を Lambda環境へ注入する。
Web は CloudFormation outputs から `VITE_API_BASE_URL`, `VITE_COGNITO_AUTHORITY`,
`VITE_COGNITO_CLIENT_ID`, callback/logout URL を設定する。

CDK parameter の callback、logout、CORS origin、globally unique domain prefix は環境ごとに
明示する。本リポジトリの検証では deploy、bootstrap、実AWS credential を使用しない。
