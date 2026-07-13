# 作業ログ: GitHub Actions CD 実装

## 指示と要求整理

- 参照元: `https://github.com/tsuji-tomonori/rag-assist/blob/main/.github/workflows/deploy.yml`。
- GitHub Actions から既存 `RagEngineeringStack` を AWS CDK で配備できる CD を実装する。
- repository rules に従い、ローカルでは synth までとし bootstrap/deploy/実 AWS API は実行しない。
- 設定変更、認証境界、アーキテクチャ判断、検証選定、Taskfile 実行、完了報告の各 repository
  skill を適用する。

## 2026-07-13 調査と確認結果

- 開始時 worktree は clean、branch は `main`。
- 参照 workflow は `workflow_dispatch`、GitHub Environment、OIDC role、Environment 単位の
  concurrency、opt-in bootstrap、typecheck/build/CDK test、synth/deploy output artifact を持つ。
- Web 参照ページの直接取得は browse cache miss。raw GitHub URL を `curl -fsSL` で取得して
  同一一次資料の内容を確認した。
- 既存 CI は locked Python/Node install、lint、typecheck、Python/Node tests、build、design drift、
  skill validation、CDK synth、Playwright E2E を実行する。Taskfile は意図的に deploy target を持たない。
- `RagEngineeringStack` は `CognitoDomainPrefix` と `AlertEmail` が deploy 時必須で、callback、
  logout、CORS origin、monthly budget も Environment ごとの値を必要とする。
- production Web は Cognito user pool/client と AppSync URL を必要とするが、これらは stack output
  で初回 deploy 前には確定しない。既存 stack は現在の outputs から先に Web を build し、初回だけ
  非利用 URL で基盤を作成後、同じ workflow 内で outputs を使って production Web を再 build/deploy
  する二段階方式を採用する。
- GitHub 公式仕様では OIDC に `id-token: write` と provider action が必要で、Environment 使用時は
  protection rules が推奨される。AWS trust policy は `aud=sts.amazonaws.com` と Environment を含む
  exact `sub` を検証する必要がある。
- 参照 Action tag を一次 repository で解決し、CD workflow は supply-chain 境界として full commit
  SHA に固定する方針とした。

## 品質シナリオと設計判断

- シナリオ: 承認済み運用者が `main` の検証済み revision を Environment 指定で手動配備する。
- 失敗モード: feature branch 配備、長期 key 流出、誤 account、設定欠落、同時更新、未検証 artifact、
  初回 output 不在、identity endpoint replacement 後の古い Web 設定。
- 測定条件: workflow contract test が event/permissions/OIDC/account allowlist/concurrency/pinned SHA/
  verification dependency/parameter/output reconciliation を検証し、`task verify` と `task synth` が合格する。
- verification job は AWS OIDC 権限を持たず、生成した Lambda/Web/synth artifact だけを deploy job へ
  渡す。deploy job の Node install は lifecycle script を無効化する。
- bootstrap は default false、通常 deploy role と分離し、明示された bounded CloudFormation execution
  policy を使用する。Environment ごとの role trust と permissions は外部 prerequisite とする。

## 実行コマンドと実結果

- `git status --short`, `git branch --show-current`: clean、`main`。
- repository skill 6件を全文確認: behavior/config、security/IAM、architecture、test selection、Taskfile、
  post-task report の必須事項を確定。
- `curl -fsSL <raw deploy.yml>`: pass、参照 workflow 全文取得。
- `git ls-remote`（checkout/setup-node/setup-uv/configure-aws-credentials/upload/download-artifact）:
  pass、使用予定 release tag と commit SHA を確認。
- `node_modules/.bin/cdk deploy --help`, `node_modules/.bin/cdk bootstrap --help`: pass、parameter、
  output、approval、execution-policy、termination-protection の CLI contract を確認。deploy/bootstrap は未実行。

## 未解決・後続

- workflow、contract test、REQ/ARC/DES/OPS/TRACEABILITY を実装する。
- 対象 test、docs drift、synth、全ローカル gate を実行する。
- AWS/GitHub Environment の外部設定はローカル検証できないため、正確な prerequisite と残余リスクを
  OPS と本報告に残す。

## 2026-07-13 初回実装と狭域検証

- `.github/workflows/deploy.yml`、workflow contract test、REQ-013、ARC-004、DES-006、OPS-004、
  TRACEABILITY、README/既存OPS同期を実装した。
- `ruby` による YAML load: pass。
- `git diff --check`: pass。
- `uv run pytest tests/test_deploy_workflow.py`: 4 pass / 1 fail。全 Action が SHA 固定である検査は
  合格したが、Action 行数の test 期待値を9と数え違え、実数10で失敗した。期待値を10へ修正し再検証する。
- 修正後 `uv run pytest tests/test_deploy_workflow.py`: pass、5 tests。
- official `actionlint` v1.7.12: release SHA-256 `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8`
  と一致、`.github/workflows/deploy.yml` は警告なしで pass。
- `uv run ruff check/format --check tests/test_deploy_workflow.py`: default uv cache の read-only error で
  未実行。sandbox failure と分類し `/tmp/uv-cache` 指定で再実行する。
- `task docs:check`: Python側の途中 command 後、`.prototools` 指定 npm 10.9.2 未導入で fail。
  dependency failure と分類し、指定version導入後に target 全体を再実行する。
- `proto install npm 10.9.2`: pass。既存 tool directory をshimへ有効化し、`npm --version` は10.9.2。
- cache修正後の Ruff: 新規 test の import order/format 2指摘で fail。実装修正後に再実行する。
- npm修正後の `task docs:check`: backend/Web checks はpass、infra snapshot staleで fail。今回変更は
  CDK stack外のため、generatorと差分を調査して原因を分類する。未合格。
- 調査中に別作業 `20260713-fix-ci-reproducible-lambda-bundle` の未commit変更が同じ worktree へ入り、
  `bundle-api.mjs` の正規化と新規 infra test が snapshot fingerprint を変更していた。開始時には存在せず、
  本作業では相手の実装・文書・生成物を変更または破棄しない。
- 整形後 `ruff check`, `ruff format --check`, CD workflow pytest 5件: pass。
- 現在の統合状態で `npm test -w @rag-engineering/infra`: pass、bundle/stack 2 tests。
- `task synth`: pass。Web production build、Lambda bundle、CDK synth が完了。81個の未設定 CDK feature
  flag notice は既存の非失敗 notice。bootstrap/deploy/実AWS APIは未実行。
- 同時作業がsnapshot/inventoryを再生成後、`task docs:check`: pass。backend/Web/infra driftと8 skillsを確認。
- 続く `task verify`: lint、Ruff format、ESLint、Pyright、Mypy、全TS typecheck、Python 30 tests、
  contract 2 tests、Web 6 tests、infra 7 tests、全buildまではpass。後半 `docs:check` のinfra snapshotが
  再びstaleとなりtarget全体はfail。同時進行のbundle再現性検証が `lambda-dist` をclean installして
  asset fingerprintを更新した競合と分類する。全体gateは未合格のまま、生成物安定後に再実行する。

## 2026-07-13 最終検証

- bundle作業側のatomic install/completion markerと生成物が安定後、単独
  `npm run docs:snapshot:check -w @rag-engineering/infra`: pass。
- `task verify` 再実行: pass、exit 0。解決された target/command と結果は次のとおり。
  - `task lint`: Ruff check/format（101 files）、ESLint pass。
  - `task typecheck`: Pyright 0 errors、Mypy 95 source files、全workspace TypeScript pass。
  - `task test`: Python 30、contract 2、Web 6、infra 7 tests、fail/skip 0。
  - `task build`: contract/Web/infra/Lambda bundle production build pass。
  - `task docs:check`: backend/query/Web/Infra driftとrepository skills 8件 pass。
  - `task synth`: CloudFormation synth pass。81 feature flag noticeは非失敗の既存notice。
- `uv run pre-commit run --all-files`: 初回はsandboxのread-only `~/.cache/pre-commit` でfail。
  同じcommandだけを権限委譲して再実行し、ruff check/format hooksともpass。
- official `actionlint` v1.7.12、`git diff --check`: 最終状態でpass、警告・whitespace errorなし。
- permission delegation: pre-commit cache書込みと、検証用actionlint release/tag取得だけ。AWS/GitHub
  Environmentへのmutation、bootstrap、CDK deploy、実AWS APIは実行していない。

## 成果物

- `.github/workflows/deploy.yml`: manual protected CD、verify/deploy分離、OIDC、bootstrap分離、
  output-driven Web build、endpoint reconciliation、artifactを実装。
- `tests/test_deploy_workflow.py`: trigger、Environment、concurrency、permission isolation、long-lived key不在、
  Action SHA固定、全gate、parameter/output reconciliationを検証。
- `REQ-013`, `ARC-004`, `DES-006`, `OPS-004`: 品質シナリオ、根拠、代替、設定、IAM trust、実行・障害・
  復旧を正本化。README、OPS-001/002、TRACEABILITYを同期。
- `tasks/done/20260713-implement-continuous-delivery.md`: 受け入れ証跡を反映した完了task。

## セキュリティレビュー

- route/store/ACL実装は変更しておらず、認証主体、pre-retrieval hard filter、post-retrieval再検査の境界に
  影響なし。既存infra testでproduct route認証、public health、固定Bedrock model ARN、wildcard不在がpass。
- workflowはmanual `main` とEnvironment approvalを要求し、Environmentごとのconcurrencyで直列化する。
  外部Environment ruleとAWS trustはexact repository/environment subjectをOPSで必須化した。
- workflow-levelは`contents: read`のみ。OIDC `id-token: write`はverify成功後のdeploy jobに限定し、
  checkout credentialを永続化せず、deploy jobのnpm lifecycle scriptを無効化した。
- static access keyを受け付けず、OIDC role ARNのaccount一致とconfigure actionのaccount allowlistを二重検査。
  bootstrap/deploy roleを分離し、toolkit execution policyとpermissions boundaryを明示必須にした。
- callback/logout/CORS originは同一のHTTPS `WebUrl` outputから作り、production WebはCognito/AppSync output
  だけでbuildする。stack discovery/config/output不整合はfail closed。
- 全外部Actionは確認済みreleaseのfull commit SHAへ固定。verified bundleはrun固有artifact名を使い、
  deploy outputにcredentialやsecretを含めない。

## Instruction fit

- active taskを実装前に`tasks/do`へ置き、判断・command・failure・再実行結果を作業中から本報告へ追記した。
- behavior/config、architecture、security、test selection、Taskfile、post-task report skillsを適用した。
- REQ/ARC/DES/OPS/TRACEABILITYを同一変更で同期し、生成対象外のCD設定について既存generated artifactを
  手編集しなかった。同時作業のbundle実装・文書は保持し、本作業の成果として扱わない。
- Taskfile/CIへdeploy target/stepを追加せず、deployment commandは保護workflow内だけに置いた。
- `.workspace/`、benchmark answer、fixture分岐、demo fallback、silent degradationを追加していない。
- commit/pushは依頼scope外のため実行していない。日本語commit skillは未使用。

## 残余リスクと意図的な未実行

- GitHub Environment reviewer/branch rule、AWS OIDC provider、role trust/permission/boundaryはrepository外部状態。
  OPS-004どおりの設定と定期監査が必要で、ローカルでは実効権限を検証できない。
- 初回foundationと最終deployの間は非利用設定のWebが存在し得るため、workflow完了まで利用開始しない。
  最終またはreconciliation failureは完了扱いにせず、同じ`main` revisionから再実行する。
- GitHub-hosted runner、Artifact、AWS STS/CloudFormation/CDK endpoint障害時はfail closedするが、可用性は
  外部providerに依存する。Action SHA更新はrelease確認とtest更新を伴う明示変更が必要。
- `task e2e`: production UI component/flowを変更していないためskip。CD workflowとruntime config生成は
  actionlint、contract test、build、CDK tests/synthで検証した。
- bootstrap/deploy/実AWS API/Actions run: repository ruleとユーザー指示により未実行。これらをlocal passの
  証拠には含めない。
