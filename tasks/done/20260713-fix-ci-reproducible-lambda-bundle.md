# CI Lambda bundle 再現性修正

- 状態: done
- 指示: `main` の GitHub Actions CI が失敗している原因を特定し、deploy を行わずに修正する。

## 受け入れ条件

- [x] 同一の source と lock から生成した Lambda bundle が checkout 絶対パスに依存しない。
- [x] CDK synth template の Lambda asset key がローカルと CI で再現可能になる。
- [x] host 固有 path の混入を拒否する回帰テストがある。
- [x] CloudFormation snapshot と infra inventory が修正後の実装から再生成される。
- [x] REQ、DES、TRACEABILITY と作業報告が実装に同期する。
- [x] 選定したローカル完了 gate が合格し、deploy は未実行と記録される。

## 完了証跡

- local uv 0.6.12 と別 checkout path の uv 0.11.28 で全 bundle file fingerprint が一致し、
  `diff -qr` は差分 0 件。
- `npm test -w @rag-engineering/infra`: bundle/stack test pass。
- `task docs:generate`, `task docs:check`, `task verify`: pass。
- `uv run pre-commit run --all-files`: pass。
- 詳細は `reports/working/20260713-fix-ci-reproducible-lambda-bundle.md` を参照。
