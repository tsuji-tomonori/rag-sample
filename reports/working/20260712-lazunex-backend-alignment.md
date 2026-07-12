# Lazunex backend and automatic-design alignment

## 指摘

- 既存バックエンドは約1,577行の機能実装を持っていたが、`api.py` と `services.py` に集約され、Lazunexのoperation単位構造を満たしていなかった。
- API設計書は独自の `docs/generated/*.md` 形式で、Lazunexの `docs/spec/40.apis/{domain}/{operation}/*_gen.md` と一致していなかった。

## 対応

- 4 operationを `src/app/apis/{domain}/{operation}/` に分割した。
- 各operationへ `router.py`、`functions.py`、`schemas.py`、`samples.py`、`contract.py`、`message_catalog.py`、`queries.py`、`generated/`、`sql/` を配置した。
- HTTP処理順をrouter、業務処理をfunctions、RAG provider資源を`RagRuntime`へ分離した。
- Lazunexと同じ生成器名、出力階層、生成ファイル名、主要見出しを実装した。
- operation layout、contract、function call、Mermaid、query wrapper、operational messageの機械検査を追加した。

## 未完了

- 旧独自生成物と互換集約ファイルは利用者承認後に削除した。
- commitとpublic GitHub pushは検証完了後に行う。

## ローカル検証結果

- `task verify`: pass
- Ruff lint/format: pass
- ESLint: pass
- Pyright: 0 errors
- Mypy strict: 88 source files / no issues
- TypeScript typecheck: contract、Web、Infraすべてpass
- Pytest: 24 passed
- Contract test: 2 passed
- Web unit test: 6 passed
- Infra assertion test: 6 passed
- API/Web/Infra generated docs byte-level drift: pass
- operation layout、function call、Mermaid、query wrapper、message catalog check: pass
- repository skills: 8 validated
- production build: pass
- CDK synth: pass
- Playwright desktop/mobile E2E: 2 passed
- deployおよび実AWS API call: 未実施

## Infra document follow-up

- 初回対応はファイル分割だけで、Rag-assistのresource要約・domain集計・masking・logical ID別表現を移植できていなかった。
- Rag-assistの `tools/infra-inventory/generate-infra-inventory.mjs` を正本として移植した。
- 現在のCDK synth templateをcommitted snapshotへ変換し、snapshotと生成Markdown/JSONをbyte-level検査する。
- 参考元renderer移植後の `task verify` は、Lint、全型検査、24 Python test、2 contract test、6 Web test、6 Infra test、build、docs drift、skills、CDK synthを含めてpassした。
- deployおよび実AWS API callは実施していない。

## API sequence follow-up

- sequenceが手書き `contract.sequence` 由来で、実際のdata store、embedding、LLM呼び出しを表現していなかった。
- operation function引数へ `ChunkStorePort`、`EmbedderPort`、`AnswerGeneratorPort` を明示し、routerで処理stepを分離した。
- `tools.api_analysis` でrouter await順、function docstring、port call、条件、raise、audit eventをAST解析する。
- sequence、detail design、query specification、unit test factorを同じ解析結果から生成する。
- runtime未使用のダミーSELECTをquery設計から除外した。
- `task verify`: pass。Ruff、ESLint、Pyright、Mypy、全TypeScript型検査、25 Python test、2 contract test、6 Web test、6 Infra test、全build、docs drift、skills、CDK synthを含む。
- `task e2e`: desktop/mobile 2 passed。
- answer/search/ingestの生成sequenceに `participant DB as DB: Chunk Store`、`API->>DB:`、実port methodが存在することをtestで固定した。
- deployおよび実AWS API callは実施していない。
