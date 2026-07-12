---
id: OPS-003
status: confirmed
---
# Monitoring and cost response

CloudWatch dashboardでLambda error/throttle、REST 5xx、CloudFront 5xx、duration、invocationを確認する。
alarm発生時は request IDを使って暗号化API logを追跡し、本文・質問・citation原文をlogへ追加しない。

月額budgetの80%通知では、Lambda invocation/duration、Bedrock model invocation、Knowledge Base
retrieve、S3 Vectors、CloudFront transferを確認する。上限緩和は評価とcapacity evidenceを伴う
設計変更として行い、alarmを無効化して回避しない。
