---
id: REQ-013
status: confirmed
source: rag-assist deploy workflow and GitHub Actions OIDC specifications
---
# 承認付き継続的デリバリー

運用者は、検証済み `main` revision を保護された GitHub Environment の承認と短期 AWS credential
だけで対象 AWS account/region へ再現可能に配備できる。

## 受け入れ条件

- deploy は `workflow_dispatch` だけから開始し、Environment の branch rule と reviewer 承認を必須とする。
- lint、typecheck、test、build、設計 drift、CDK synth の失敗時は AWS credential を取得せず終了する。
- AWS は GitHub OIDC の exact audience/subject を検査する Environment 別 role で認証し、長期 key を使わない。
- deploy role、bootstrap role、CloudFormation execution policy を分離し、bootstrap は明示 opt-in とする。
- account ID と全必須 parameter は deploy 前に検証し、欠落・不正・stack discovery 障害を fail closed とする。
- 初回も stack outputs から production Web 設定を生成し、identity endpoint 置換時は Web asset を再同期する。
- Environment ごとに実行を直列化し、verified synth と最終 outputs を期限付き artifact として保存する。
- workflow が利用する外部 Action は full commit SHA に固定する。
