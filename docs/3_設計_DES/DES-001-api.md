# DES-001 API 設計

各operationは `backend/src/app/apis/{domain}/{operation}/` に配置し、`router.py` をHTTP処理順、
`functions.py` を業務処理、`schemas.py` を入出力型、`samples.py` を仕様サンプルの正本とする。
`contract.py`、`message_catalog.py`、`generated/queries.py`、`sql/` もoperation単位で管理する。
RAG data accessは `app.integrations.{resource}.port` の型注釈を正本とし、未使用SQLを
DBアクセスとして扱わない。routerのawait順とfunctionsのport呼び出しをAST解析して設計書を生成する。

`uv run app-docs` は `docs/spec/40.apis/apis_list_gen.md` と、operationごとの
`if_gen.md`、`detail-design_gen.md`、`sequence_gen.md`、`unit-test_gen.md`、
`messages_gen.md`、`query_gen.md` を生成する。保護APIはBearer access tokenを必須とする。
