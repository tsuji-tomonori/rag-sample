# PR CI Lambda bundle lock整合修正

- 状態: do
- 指示: PR #1のレビューで判明したLambda bundleのlock不整合を修正し、CI成功後にmergeする。

## 受け入れ条件

- [x] Lambda bundleの全dependencyが`uv.lock`のversionと一致する。
- [x] dependency artifactはlockに記録されたhashで検証される。
- [x] project sourceの追加が未固定build backendの解決に依存しない。
- [x] Lambda bundle単独でhandlerをimportできるruntime dependencyを含む。
- [x] fresh bundleでCloudFormation snapshot checkが合格する。
- [x] 回帰test、生成設計、traceability、作業報告が修正後の挙動と一致する。
- [ ] ローカル完了gateとPR CIが合格し、レビュー解決を記録してmergeする。

## ローカル証跡

- uv 0.6.12と0.11.28、異なるcheckout pathでbundle ID `773c8e244e52851f`、全file content/mode、
  正規化fingerprint `2d2b6ef5ec7d54738a34d4afc33d8683424fc1bbe437a4e02f1ce5f3b9237865`が一致。
- bundleだけを`PYTHONPATH`へ指定したPythonで`app.lambda_handler`をimportでき、実行後もPython cacheは0件。
- `npm test -w @rag-engineering/infra`: 7 tests pass。
- `npm run docs:snapshot:check -w @rag-engineering/infra`, `task docs:check`, `task verify`: pass。
- `uv run pre-commit run --all-files`, `git diff --check`: pass。
