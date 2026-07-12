---
id: REQ-011
status: confirmed
source: docs/rag-engineering-guide.pdf sections 8.4-8.6
---
# Observability, capacity, and cost

AWS runtime は機微内容を記録せず、障害・throttle・latency・配信5xx・月額costを運用者が検知できる。

## 受け入れ条件

- API logをKMS暗号化し1年間retainする。
- Lambda error/throttle、REST 5xx、CloudFront 5xx rateをalarm化する。
- dashboardでalarm、latency、invocationを確認できる。
- API throttleとLambda reserved concurrencyで上限を定義する。
- `System=rag-engineering` tagで月額budgetを集計し80%でoperator emailへ通知する。
