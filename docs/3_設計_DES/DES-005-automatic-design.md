# DES-005 Automatic design pipeline

`uv run app-docs` は FastAPI runtime OpenAPI と `app.design_contract` を結合し、API interface、
business summary、auth/permission、Mermaid sequence、message、test factorを生成する。operation IDの
集合が一致しない場合は生成自体を失敗させる。

`npm run docs:web` は `apps/web/design-contract.json` とproduction `App.tsx` labelを照合する。
`npm run docs:infra` は CDK synth templateからresource、retention、parameters、outputs、IAM actionsを
生成する。全artifactは `docs/generated/` に置き、`task docs:check` はbyte-level driftを拒否する。
