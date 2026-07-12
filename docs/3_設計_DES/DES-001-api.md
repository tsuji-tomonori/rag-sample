# DES-001 API 設計

各operationは `src/app/apis/{domain}/{operation}/` に配置し、`router.py` をHTTP処理順、
`functions.py` を業務処理、`schemas.py` を入出力型、`samples.py` を仕様サンプルの正本とする。
`contract.py`、`message_catalog.py`、`generated/queries.py`、`sql/` もoperation単位で管理する。

`uv run app-docs` は `docs/spec/40.apis/apis_list_gen.md` と、operationごとの
`if_gen.md`、`detail-design_gen.md`、`sequence_gen.md`、`unit-test_gen.md`、
`messages_gen.md`、`query_gen.md` を生成する。保護APIはBearer access tokenを必須とする。
