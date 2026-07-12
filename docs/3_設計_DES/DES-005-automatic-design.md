# DES-005 Automatic design pipeline

`uv run app-docs` はFastAPI runtime OpenAPI、`app.apis.contracts`、operation-local `contract.py`、`schemas.py`、
`samples.py`、`message_catalog.py`、`sql/`を結合する。Lazunexと同じ出力階層、生成ファイル名、
見出し構成でinterface、detail design、Mermaid sequence、message catalog、query specification、
unit test factorを生成する。operation IDまたは必須operationファイルが一致しない場合は失敗する。

`npm run docs:web` は `apps/web/design-contract.json` とproduction `App.tsx` labelを照合する。
`npm run docs:infra` は CDK synth templateからresource、retention、parameters、outputs、IAM actionsを
生成する。API artifactは `docs/spec/40.apis`、Web/Infra inventoryは各設計正本が定める出力先に置く。
`task docs:check` はbyte-level drift、operation layout、query wrapper、message catalogを拒否する。
