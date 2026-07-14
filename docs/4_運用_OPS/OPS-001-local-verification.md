---
id: OPS-001
status: confirmed
---
# ローカル検証

`task setup` 後、通常の完了 gate は `task verify`、ブラウザは `task e2e` とする。sandbox が
loopback を拒否する環境では E2E command のみ権限委譲し、外部URLや実AWSへ接続しない。
`task synth` は CloudFormation 生成だけを行う。Taskfile と検証用 `ci.yml` は deploy target/step を
持たず、配備は OPS-004 の保護された手動 CD workflow に分離する。

生成設計を更新する変更では先に `task docs:generate`、その後 `task docs:check` を実行する。
失敗、timeout、skip は pass として記録しない。

製品資産の正規 path は `backend/`、`frontend/`、`infra/`、`docs/`、`tools/` とする。
Python test は `backend/tests`、Web E2E は `frontend/web/e2e`、infra test は `infra/test` に置く。
旧 `apps/`、`packages/`、`src/`、ルート `tests/` を互換 path として復元しない。
