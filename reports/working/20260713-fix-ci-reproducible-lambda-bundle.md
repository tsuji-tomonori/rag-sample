# 作業ログ: CI Lambda bundle 再現性修正

## 指示と要求整理

- `main` の GitHub Actions CI 失敗を調査し、原因に限定した修正を行う。
- repository rules に従い、実装、生成設計、traceability、検証証跡を同じ変更に含める。
- deploy は行わない。

## 2026-07-13 調査結果

- 開始時 worktree は clean、branch は `main`、current branch に対応する PR は存在しない。
- GitHub CLI は `repo` と `workflow` scope で認証済み。
- 最新の push run `29195911812` の `verify` job は、lint、typecheck、Python/Node test、build、
  API/Web design check まで成功し、`npm run docs:infra:check` だけが
  `Infra CloudFormation snapshot is stale` で失敗した。
- ローカルの `/usr/bin/npm run docs:snapshot:check -w @rag-engineering/infra` は成功した。
- `infra/scripts/bundle-api.mjs` は source と lock から bundle ID を生成する一方、
  `uv pip install --target` の出力をそのまま CDK asset に渡している。
- bundle の `*.dist-info/direct_url.json` と `bin/*` shebang に checkout/.venv の絶対パスが入り、
  `*.dist-info/RECORD` にそれらの path-dependent hash が記録される。CDK は bundle 全体を
  fingerprint するため、ローカルと GitHub-hosted runner で Lambda `S3Key` が一致しない。
- uv 0.6.12 とCIのuv 0.11.28を比較すると、timestampを持つ `uv_cache.json` とversion依存の
  `uv_build.json` も異なった。これらもruntimeに不要だがCDK fingerprintへ混入していた。
- `uv pip install` 失敗後にtarget directoryだけが残ると、従来の存在確認は不完全bundleを完成済みと
  誤認できた。隔離検証でnetwork failure後に `.lock` だけが残ることを確認した。

## 承認済み修正方針

- Lambda runtime に不要な host-dependent installer artifact を bundle 生成時に正規化する。
- 絶対 checkout path が残らないことを回帰テストで拒否する。
- snapshot と infra inventory を再生成し、対象 test、docs drift、synth、選定した完了 gate を実行する。

## 実行コマンドと実結果

- `gh auth status`: pass。
- `gh run list --limit 20 --json ...`: 最新失敗 run `29195911812` を特定。
- `gh run view 29195911812 --json ...`, `gh run view 29195911812 --log-failed`: 上記 failure を確認。
- `/usr/bin/npm run docs:snapshot:check -w @rag-engineering/infra`: pass（環境差による failure の証拠）。
- `proto install node 22.14.0`, `proto install npm 10.9.2`: pass。初回target testはrepository指定npmが
  未導入のdependency failureであり、導入後に再実行した。
- bundle scriptを更新し、console scripts、`direct_url.json`、`uv_cache.json`、`uv_build.json` と
  対応する `RECORD` 行を除外した。checkout path残存時は明示的に失敗させる。
- bundle ID対象をpackaged `src` とbundle scriptまで拡張し、staging install成功後に
  `.bundle-complete` marker付きdirectoryを原子的に公開するよう変更した。
- `/tmp` の別checkout pathでuv 0.11.28を使ったfresh installと、local uv 0.6.12 bundleを比較:
  全ファイルfingerprintは双方
  `650c22d0e5113a42d3795182b72ed69b3a79fb59c5927804ec23a0d3332e89d9`、`diff -qr` は差分0件。
- `task docs:generate`: pass。解決commandはbackend/query、Web、Infra生成で、Infraはbundle、
  CloudFormation snapshot、inventoryを更新した。permission delegationなし。
- `npm run lint`: pass。
- `npm run typecheck -w @rag-engineering/infra`: pass。
- `npm test -w @rag-engineering/infra`: pass（bundle/stack test files 2件、fail/skip 0）。
- `task docs:check`: pass。API/query/Web/Infra driftとrepository skill 8件を検証、
  permission delegationなし。
- `task verify`: pass。解決commandはRuff/ESLint、Pyright/Mypy/TypeScript、pytest、全Node test、
  production build、design drift、skill validation、CDK synth。pytest 30件、Contract 2件、Web 6件、
  Infra 7件がpass、fail/skip 0。permission delegationとdeployなし。
- `uv run pre-commit run --all-files`: pass（ruff check、ruff format）。
- architecture review後の `task docs:check`: pass。Infra inventoryはup-to-date、skill 8件を再検証。
- `git diff --check`: pass。
- 最終 `gh run list --limit 5 --json ...`: 新revision runはなく、latestは修正前SHA `48eabf1` の
  failure `29195911812` のまま。commit/push後のrunでのみ本修正を外部検証できる。
- deploy command: 未実行。

## 更新artifact

- `infra/scripts/bundle-api.mjs`: portable metadata正規化、checkout path guard、atomic cache publish。
- `infra/test/bundle.test.ts`: completion marker、metadata除外、path漏えい、`RECORD`整合の回帰test。
- `infra/test/__snapshots__/rag-engineering-stack.snapshot.json`: 再現可能bundleから生成したLambda
  `S3Key` `551d0d94e63424fc6c6c1d2935b3921182921763a717f63479418b3f367bc940.zip`。
- `REQ-008`, `ARC-003`, `DES-005`, `docs/TRACEABILITY.md`: path非依存要求、品質シナリオ、決定、
  代替/制約、実装・検証証跡を同期。
- active taskと本作業報告。

## Architecture review

- 品質シナリオ: 同一source/lockを異なるcheckout pathとuv versionでbuildしても、runtime fileと
  CDK asset keyが一致する。
- failure mode: PEP 610 local URL、console script shebang、timestamp/tool固有metadataとその
  `RECORD` hashがartifactへ混入する。
- 公式根拠: Python Packaging Direct URL/Recording Installed Projects仕様、uv `--target`仕様。
- rejectした代替: snapshot keyのmask、CDK custom asset hash、uv version固定だけの対応。
- assumption/limit: Lambda runtimeは除外したinstaller bookkeepingとconsole scriptsを参照しない。
  core metadataとentry point定義は保持する。初回staging分のdiskとcached buildの線形scanが増える。

## 受け入れ条件とfit

- path非依存: uv 0.6.12/local pathとuv 0.11.28/別pathの全file fingerprint一致、diff 0件。
- CDK再現性: regenerated snapshot checkと`task synth`がpass。
- 回帰test: Infra test 7件中portable bundle testを含め全件pass。
- 生成設計: `task docs:generate`後、`task docs:check`がpass。
- 文書/traceability: REQ、ARC、DES、TRACEABILITY、本報告を同じ変更で更新。
- local completion gate: `task verify`とpre-commitがpass。deployは未実行。
- 適用skill: GitHub Actions failure調査、implementation docs、Taskfile runner、test selector、
  architecture review、post-task fit report。route/auth/ACL/UIは変更していないためsecurity/UI skillは対象外。
  commitを指示されていないためcommit skillは未使用。

## 残余リスク・外部状態・skip

- 修正を含むcommit/pushは本指示のscope外であり、GitHub Actions上の新revision runは未実行。
  旧revisionのrerunでは修正を検証できないため実施していない。
- `task e2e` はproduction UI/browser flowを変更していないためskipした。
- AWS deploy/bootstrap/実AWS APIはscope外かつ明示承認がないため実行していない。
- 作業中に別のcontinuous-delivery task由来のREADME、OPS、workflow、test等の変更がworktreeへ現れた。
  本修正ではそれらを編集・削除せず、全体`task verify`が現状態でpassすることだけを確認した。

## 2026-07-14 PR CI follow-up

- branch `agent/cd-and-bundle-reproducibility`をPR #1として`main`向けに作成した。
- GitHub Actions run `29263108597`の`verify`は、lint、typecheck、test、buildまでpassした後、
  `docs:infra:check`で`Infra CloudFormation snapshot is stale`となりfailした。
- CIはuv 0.11.28のfresh installで`rich-toolkit==0.20.3`をbundleへ導入した。一方、
  `uv export --frozen --no-dev --no-emit-project`で確認した`uv.lock`のversionは`0.20.1`だった。
- 根本原因は、`bundle-api.mjs`がbundle IDへ`uv.lock`を含めながら、実際のinstallでは
  `uv pip install <project>`によるversion rangeの再解決を行い、lockを入力にしていなかったことである。
- PRへblockingのCOMMENT reviewを投稿した。ユーザー承認後、lockのproduction dependencyをexportし、
  hash検証付きでtargetへinstallする。projectは未固定build backendでwheel化せず、packaged sourceを
  直接配置する。回帰test、snapshot、REQ/ARC/DES/TRACEABILITY、task証跡を同期して再検証する。
- このfollow-upでもbootstrap、CDK deploy、実AWS APIは実行しない。

## 2026-07-14 lock整合修正の実装・ローカル検証

- `bundle-api.mjs`は`uv export --locked --no-dev --no-emit-project`でruntime dependencyを
  requirementsへ書き出し、`uv pip install --no-deps --require-hashes --target`でlockのversion/hashを
  必須入力にした。project wheelはbuildせず、cache fileを除外した`src`をstagingへ直接配置する。
- 全installed `*.dist-info/METADATA`のname/versionが`uv.lock`内に存在すること、source entrypoint、
  completion marker、path漏えい、installer metadata、Python cache不在を`bundle.test.ts`で検証する。
- 初回`npm test -w @rag-engineering/infra`はsandbox DNS制限によるPyPI取得失敗でfail。ネットワーク許可付き
  再実行では、local test由来の`src/**/__pycache__`にcheckout pathが残り、path guardがfail closedした。
  production source列挙から`__pycache__`, `*.pyc`, `*.pyo`, `.DS_Store`を除外して再実行し、7 tests pass。
- uv 0.6.12/local checkoutと公式uv 0.11.28/別checkoutのfresh bundleを比較した。最初の比較では内容差分0件
  だったが、uv target marker `.lock`のmodeが`0755`対`0644`だったためruntime不要metadataとして除外した。
- bundle単独のhandler import smoke testを追加したところ、Lambda adapterの`mangum`がdev dependencyにしか
  存在せず、production bundleに欠落していたことを検出した。`mangum`をproject dependencyへ移し、
  `uv lock --offline`で既存lock entryをproduction dependencyとして更新した。
- smoke test自身が生成するPython bytecodeもartifact差分となるため、`-B`、
  `PYTHONDONTWRITEBYTECODE=1`を指定し、正規化処理はbundle全体の`__pycache__`、`*.pyc`、`*.pyo`を除外する。
- 最終比較はbundle ID `773c8e244e52851f`、`diff -qr`差分0件、file mode差分0件、mtime/ownerを
  正規化したtar fingerprintが双方
  `2d2b6ef5ec7d54738a34d4afc33d8683424fc1bbe437a4e02f1ce5f3b9237865`で一致した。
- `task docs:generate`: pass。解決commandはbackend/query/Web/Infra生成。最終script変更後に
  `npm run docs:infra`を再実行し、Lambda asset `S3Key`を
  `d270114e7f03d4c486443bd0f7aaff7808497037b18d127723be4af6730fd4d4.zip`へ更新した。
- targeted check: `npm run lint`, `npm run typecheck -w @rag-engineering/infra`,
  `npm run docs:snapshot:check -w @rag-engineering/infra`はいずれもpass。
- 最終`task docs:check`はsandbox内でbuild backend取得時のDNS制限により一度failし、許可済みの
  network経路で再実行してpass。API/query/Web/Infra driftとrepository skills 8件を検証した。
- `task verify`: pass。Ruff/ESLint、Pyright 0 errors、Mypy 95 files、全TypeScript typecheck、Python 30、
  contract 2、Web 6、Infra 7 tests、全build、design drift、CDK synthがpass。CDK feature flag 81件は
  非失敗notice。deployは実行していない。
- 最終`uv run pre-commit run --all-files`: Ruff check/format hooks pass。
- `git diff --check`: pass。`task e2e`はproduction UI/component/flowを変更していないためskipした。
- 修正commit `86c3c38`をbranchへpushした。残作業はPR CI確認、review follow-up、merge。
  AWS bootstrap/deploy/APIは未実行。

## 2026-07-14 PR CI・再レビュー結果

- GitHub Actions run `29266264865`の`verify` job `86872210070`は1分38秒でpassした。
  uv locked sync、npm clean install、lint、型検査、Python/Node test、build、全design drift、
  repository skill validation、CDK synth、Playwright Chromium E2Eを含む全stepが成功した。
- PR本文を実装と一致させ、CD workflowの起点を`main` pushではなく手動実行と明記した。
  lock version/hash準拠、bundle単体handler import、uv versionを跨ぐ再現性の検証も追記した。
- PR #1へCOMMENT reviewを投稿し、先のblocking findingが解消済みで追加blocking findingがないこと、
  実AWS deployは未実行で初回手動実行は運用手順に従うことを記録した。
- 実装・ローカルgate・外部CI・reviewの受け入れ条件が揃ったためactive taskを`tasks/done/`へ移動した。
  残る外部操作はPR mergeとmerged stateの確認である。
