# DES-005 Automatic design pipeline

`uv run app-docs` はFastAPI runtime OpenAPI、`app.apis.contracts`、operation-local `contract.py`、`schemas.py`、
`samples.py`、`message_catalog.py`、`sql/`を結合する。Lazunexと同じ出力階層、生成ファイル名、
見出し構成でinterface、detail design、Mermaid sequence、message catalog、query specification、
unit test factorを生成する。sequence、DB/resource線、query、条件、test factorは
`tools.api_analysis` がrouter/functionsのASTから導出し、contractの手書き配列では補完しない。
operation ID、必須operationファイル、runtime message、生成物が一致しない場合は失敗する。

`npm run docs:web` は `frontend/web/design-contract.json` とproduction `App.tsx` labelを照合する。
`npm run docs:infra` はCDK synth templateをsnapshot化し、Rag-assistと同じ
`tools/infra-inventory/generate-infra-inventory.mjs` でdomain集計、resource type別概要、
logical ID別主要設定、secret masking、IAM要約を生成する。API artifactは
`docs/spec/40.apis`、Web/Infra inventoryは各設計正本が定める出力先に置く。
snapshot の Lambda asset key はlock済みdependencyをhash検証し、host固有installer artifactを除いた
再現可能なbundleから導出する。
`task docs:check` はbyte-level drift、operation layout、query wrapper、message catalogを拒否する。
