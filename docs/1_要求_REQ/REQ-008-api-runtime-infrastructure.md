---
id: REQ-008
status: confirmed
source: docs/rag-engineering-guide.pdf chapters 8 and 10
---
# 認証付き API runtime

AWS 構成は Web から利用可能な API endpoint を持ち、製品 route を Cognito JWT で保護する。

## 受け入れ条件

- `/v1/documents`, `/v1/search`, `/v1/answers` は JWT authorizer を必須とする。
- `/health` だけを非機微な public endpoint とする。
- Lambda artifact は lock と source から再現可能に生成する。
- Lambda は AWS/Cognito adapter を明示設定し、local fallback を使わない。
- API role の S3、Knowledge Base、ingestion、model 権限を対象資源へ制限する。
- Lambda architecture と native dependency bundle の platform を一致させる。
- CORS origin は scheme/host/port の完全一致値として callback/logout URL と分離する。
