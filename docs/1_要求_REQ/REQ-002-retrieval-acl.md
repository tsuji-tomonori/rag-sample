---
id: REQ-002
status: confirmed
source: docs/rag-engineering-guide.pdf sections 2.2, 3.5, 8.1
---
# 検索前 ACL

システムは、利用者が閲覧できない文書をランキング候補へ入る前に除外する。

## 受け入れ条件

- 文書は所有者 subject または許可 group を一つ以上持つ。
- 権限外チャンクは疎検索、密検索、再順位付け、回答、監査本文のいずれにも入らない。
- 認証情報のない保護 API は `401` を返す。

