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

## 2026-07-12 AWS runtime adapter

- AWS 公式 Retrieve/metadata filter 仕様を確認。Bedrock ACL awareness は認証境界ではないため、
  API 認証、pre-retrieval filter、post-retrieval ACL 再検査の三層とした。
- S3 source/metadata upload、ingestion job、Knowledge Base Retrieve、Converse generation を
  port/adapter として追加。AWS 設定不足時の local fallback は禁止。
- AWS adapter 後 gate: Python 13 tests、Ruff、format、Pyright pass。実 AWS 呼出しと deploy は
  意図的に未実施。

## 2026-07-12 Cognito 認証

- AWS 公式仕様に基づき RS256/JWKS、issuer、expiration、access token、client ID、subject、
  Cognito groups を backend で再検証する設計を採用。
- local asserted group は Cognito mode で破棄し、AWS storage と local auth の組合せを拒否。

## 2026-07-12 API runtime infrastructure

- source/lock hash ごとの非破壊 Lambda bundle、Mangum handler、HTTP API、Cognito JWT authorizer、
  Hosted UI app client/domain、Lambda 最小権限を追加。
- product POST routes は JWT 必須、public は非機微な `/health` のみに制限。
- native wheel bundle と Lambda を x86_64 に統一。CORS origin を callback/logout URL から分離し、
  Cognito domain prefix を deploy 時必須 parameter とした。

## 2026-07-12 Web OIDC

- OIDC authorization code flow、session storage、Cognito access token API送信を実装。
- local と Cognito mode を設定で分離し、Cognito設定欠落時の暗黙 local fallback を禁止。
- Playwright E2E は test 内だけで API を intercept し、desktop/mobile の取込・回答・引用・
  Authorization header を検証する。本番 component に mock data は追加しない。

## 2026-07-12 認証・runtime マイルストーン検証

- Python: Ruff、format、Pyright、17 tests pass。
- Contract: typecheck、source 1 file / 2 tests、declaration build pass。
- Web: ESLint、typecheck、3 unit tests、production build、Web inventory drift pass。
- Browser: system Chrome 139、desktop/mobile Playwright E2E 2件 pass。sandbox の loopback EPERM
  回避に E2E command のみ権限委譲した。
- Infra: dependency bundle、TypeScript typecheck/build、4 CDK assertions、inventory drift、
  CloudFormation synth pass。deploy は未実施。

## 2026-07-12 Skills / automation

- rag-assist から8つの恒久的 engineering control を repository skills として採用。
- GPT-5.6 `/goal` と重複する dreaming memory、completion JSON、milestone/recovery orchestration は
  意図的に除外し `skills/README.md` と `AGENTS.md` に判断を記録。
- Taskfile、skill validator、非deploy CI、local/runtime operation docs を追加。
- `task verify`: pass。lint/typecheck、Python 17 tests、contract 2 tests、Web 3 tests、infra
  assertions、build、design drift、8 skills、CDK synth を実行。
- `task e2e`: pass、desktop/mobile 2件。loopback EPERM のため target のみ権限委譲。

## 2026-07-12 Reference architecture audit

- `docs/あーき.drawio.png` を確認し、CloudFront、private S3 SPA、CloudFront Functions、REST API、
  AppSync WebSocket/PubSub が未実装と判定。
- OAC SPA配信、path rewrite、REST Cognito methods、AppSync Cognito subscription/IAM mutation、
  Web asset deploymentをCDKへ追加。
- AWS adapterはingestion開始後、SigV4署名したAppSync mutationでdocument channelへjob IDをpublish。
- Cognito Webはingestion前にAppSync WebSocketを確立し、document channelのjob statusを表示。
- 管理者/利用者を分離し、adminだけが取込可能。AppSync subscription resolverはsubject channel
  以外をunauthorizedとし、resource IDをevent fieldへ分離。
- Reference architecture gate: Python 20 tests、Web 4 tests、infra assertions、TypeScript/Python
  lint/typecheck、Web build、Lambda bundle、CDK synth、infra inventory drift、desktop/mobile E2E pass。
- CloudFrontのglobal custom error responseはAPI 403を200へ変換するため不採用。SPA routeはviewer
  request functionだけでrewriteする。

## 2026-07-12 Operations audit

- PDF 8.4-8.6に対し、暗号化retained log、Lambda/API/CloudFront alarms、dashboard、throttle、
  reserved concurrency、tag-filtered monthly budgetと80% email通知を追加。

## 2026-07-12 Automatic design audit

- backendをOpenAPI/API一覧/detail/sequence/message/test-factorの7 artifactへ拡張しoperation ID driftを拒否。
- Webをview/action/endpoint/permission/state/auth/realtime contractとcomponent label照合へ拡張。
- Infra inventoryをlogical resource、retention、parameters、outputs、IAM actionsまで拡張。
- README、docs structure、root/Web env examplesを現在のruntime、Taskfile、認証、非deploy境界へ同期。

## 2026-07-12 Final local verification

- `task verify`: pass。Python 21 tests、contract 2 tests、Web 6 tests、infra assertion suite、
  Ruff/format/Pyright/ESLint/全TS typecheck、全build、backend/Web/infra drift、8 skills、CDK synth。
- `git diff --check`: pass。
- `task e2e`: desktop/mobile 2件 pass。sandbox loopback EPERMのため承認済み権限委譲。
- Lambda dependency bundle: source/lock hashから生成成功。
- deploy/bootstrap/実AWS credential/API call: ユーザー指示により未実施。
