---
id: REQ-010
status: confirmed
source: docs/あーき.drawio
---
# Reference architecture fidelity

AWS 構成は利用者・管理者から CloudFront、private S3 SPA、CloudFront Functions path routing、
API Gateway REST API、Lambda/FastAPI、RAG component、AppSync WebSocket Pub/Sub を接続する。

## 受け入れ条件

- S3 SPA は public accessを拒否し CloudFront OACだけから取得する。
- SPA は SSE-S3、機微な原文・監査・vectorはKMSとし、OAC key policyにwildcardを作らない。
- CloudFront Function は client-side route を `index.html` へrewriteする。
- `/v1/*` と `/health` は regional REST API originへ分岐する。
- protected REST methods は Cognito user pool authorizer を必須とする。
- AppSync subscription は Cognito、publish mutation は Lambda IAMだけを許可する。
- ingestion job開始時にLambdaからSigV4署名したAppSync eventをdocument channelへpublishする。
- Cognito Web clientはingestion前にdocument channelをsubscribeし、受信したjob statusを表示する。
- 取込はadmin groupだけに許可し、subscription channelは署名済みsubjectと一致させる。
- Web build artifact をS3 deployment assetとし CloudFront invalidationを定義する。
