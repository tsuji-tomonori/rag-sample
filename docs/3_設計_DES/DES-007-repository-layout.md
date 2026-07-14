---
id: DES-007
status: confirmed
implements: REQ-014
---
# リポジトリ配置設計

```text
backend/
  src/app/          # FastAPI runtime/domain/adapters
  tests/            # backend、workflow contract tests
frontend/
  web/              # React/Vite application and E2E
  contract/         # shared TypeScript API contract
infra/              # AWS CDK, tests, Lambda bundler
docs/               # REQ/ARC/DES/OPS and generated designs
tools/
  python/app_tool/  # Python CLI entrypoints
  python/tools/     # Python design generators/checkers
  infra-inventory/  # Node infra inventory generator
  web-inventory.mjs # Node Web inventory generator
```

Python tooling は workspace の `pythonpath` に `backend/src` と `tools/python` を設定し、wheel は
3 package を明示する。npm workspace は `frontend/contract`、`frontend/web`、`infra` の正規 path
だけを列挙する。Taskfile、CI、生成器、CDK bundle は同じ正規 path を使用する。
