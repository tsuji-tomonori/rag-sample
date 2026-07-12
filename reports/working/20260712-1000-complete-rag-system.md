# 作業ログ: RAG システム完全実装

## 指示と要求整理

- PDF の全工程を製品実装へ落とす。
- backend/frontend は lazunex の契約・自動設計規約、infra と作業方式は rag-assist を踏襲。
- ローカルで可能な検証をすべて行い、deploy しない。

## 2026-07-12 調査

- 初期 worktree は `docs/` と `.workspace/` のみで、実装本体と有効な Git metadata は未確認。
- PDF は 275 頁。第10章の最小構成に加え、第2-8章の ACL、引用、拒否、評価、監査を
  製品要求として採用した。
- backend は FastAPI port/adapter、frontend は契約駆動、infra は CDK monorepo とする。
- GPT-5.6 と `/goal` が作業継続、進捗、予算を管理するため、独自 dreaming memory や
  completion-status JSON は導入しない。task と作業根拠ログは維持する。

## 実施中

- backend 契約、ローカル RAG adapter、自動 OpenAPI 生成、要求文書を初期実装。
- Web は契約 package を介した文書取込・質問・引用確認 UI を実装。固定 demo 値は持たない。
- Infra は AWS 公式 CloudFormation 仕様を確認し、S3 Vectors 標準 Knowledge Base、暗号化、
  retain、Cognito、監査 log と assertions、自動 inventory を実装。
- 研究根拠として RAG、DPR、RRF、hybrid fusion、Self-RAG を ARC-002 に記録。

## 未対応・リスク

- frontend、AWS adapter/CDK、評価 harness、全検証、GitHub 公開は後続作業。
- Git metadata が読み取り専用の空ディレクトリに見えるため、commit 前に状態確認が必要。

## 2026-07-12 第1マイルストーン検証

- `uv run ruff check .`: pass。
- `uv run ruff format --check .`: pass。
- `uv run pyright`: pass、0 errors。
- `uv run pytest`: pass、5 tests（所有者偽装 test 追加前）。
- `npm run lint`, `npm run typecheck`: pass。
- `npm test`: Web 1 test、CDK assertions 1 suite pass。contract は runtime type guards の
  専用 test が未追加で 0 tests のため後続対応。
- `npm run build`: contract、Web production bundle、infra TypeScript build pass。
- `app-docs --check`, web/infra inventory check: pass。
- `cdk synth --quiet`: pass。deploy は未実施。
- 実 listener は startup 完了するが sandbox 内 loopback 接続が遮断される。HTTP contract は
  lazunex と同じ `ASGITransport + AsyncClient` integration tests で検証した。
- 認可レビューで所有者偽装と actor が属さない group への共有を拒否する 403 policy を追加。

## 2026-07-12 GitHub 公開状態

- root commit `e269e00` (`✨ feat(core): 根拠駆動RAGの縦切り基盤を実装`) を作成。
- `gh auth status` は account `tsuji-tomonori` の token invalid。既存 repository の上書きや
  別 credential の推測はせず、public repository 作成/push は認証復旧まで未実施。

## 2026-07-12 評価 harness

- PDF 第7章と ARC-002 に基づき Recall@k、MRR、answer status accuracy、abstention recall、
  citation precision、p50/p95 latency を artifact から集約する `app-eval` を実装。
- dataset 固有の文書名、期待語句、正解分岐は production code に入れない。
- 評価後 gate: Python 8 tests、contract 2 tests、Web 1 test、CDK assertion suite、Ruff、
  Pyright、ESLint、全 TypeScript typecheck が pass。
- `app-eval` の2 case smoke artifact で全 metric、schema version、latency percentile を確認。
