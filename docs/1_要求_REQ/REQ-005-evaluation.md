---
id: REQ-005
status: confirmed
source: docs/rag-engineering-guide.pdf chapter 7
---
# 工程別評価

システムは、検索と生成を分離して再現可能な dataset で評価し、集約結果を機械可読に出力する。

## 受け入れ条件

- 検索を Recall@k と MRR で評価する。
- 回答可否を accuracy と abstention recall で評価する。
- 引用を期待文書に対する precision で評価する。
- latency の p50 と p95、case 数を同じ artifact に含める。
- 空 dataset、重複 case ID、期待値のない answerable case を拒否する。

