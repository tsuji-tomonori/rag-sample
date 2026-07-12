---
id: OPS-001
status: confirmed
---
# ローカル検証

`task setup` 後、通常の完了 gate は `task verify`、ブラウザは `task e2e` とする。sandbox が
loopback を拒否する環境では E2E command のみ権限委譲し、外部URLや実AWSへ接続しない。
`task synth` は CloudFormation 生成だけを行う。Taskfile と CI は deploy target/step を持たない。

生成設計を更新する変更では先に `task docs:generate`、その後 `task docs:check` を実行する。
失敗、timeout、skip は pass として記録しない。
