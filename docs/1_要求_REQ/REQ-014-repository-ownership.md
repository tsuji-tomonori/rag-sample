---
id: REQ-014
status: confirmed
---
# リポジトリ所有境界

製品の backend、frontend、infrastructure、durable documentation、開発ツールは、それぞれ
`backend/`、`frontend/`、`infra/`、`docs/`、`tools/` を唯一のトップレベル所有境界とする。
モノレポ共通設定、CI、作業管理、repository skills はルートの orchestration 資産として扱う。

## 受け入れ条件

- 製品ソースと層固有テストは5つの所有境界のいずれかに存在する。
- 旧 `apps/`、`packages/`、`src/`、ルート `tests/` は存在しない。
- workspace、build、test、生成、CI、運用文書は正規パスだけを参照し、旧パス fallback を持たない。
- local verification と implementation-derived design check が再編後の構成で成功する。
