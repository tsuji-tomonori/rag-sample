---
id: REQ-006
status: confirmed
source: docs/rag-engineering-guide.pdf chapter 10 and AWS Bedrock API reference
---
# AWS runtime adapter

システムは、S3 原文、ACL metadata、標準 Bedrock Knowledge Base、S3 Vectors、Bedrock 生成モデルを
同じ port/adapter contract で利用できる。

## 受け入れ条件

- 原文と `.metadata.json` を同じ document key へ保存して ingestion job を開始する。
- Retrieve request に owner/group の metadata hard filter を必ず含める。
- AWS 応答も ACL metadata で再検査し、不足・不正 metadata は fail closed とする。
- 生成モデルへ認可済み evidence 以外を渡さない。
- AWS 設定不足時は local へ暗黙 fallback せず起動を拒否する。
