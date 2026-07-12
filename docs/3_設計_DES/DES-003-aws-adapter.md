# DES-003 AWS adapter

`RAG_STORAGE_BACKEND=aws` のとき `RAG_SOURCE_BUCKET`, `RAG_KNOWLEDGE_BASE_ID`,
`RAG_DATA_SOURCE_ID` を必須とする。S3 Vectors は semantic retrieval のため、`overrideSearchType`
は `SEMANTIC` とする。filter は `owner_subject == subject OR allowed_groups contains group` を
pre-retrieval に渡す。Bedrock の ACL awareness 自体は認証ではないため、API の検証済み bearer
subject からのみ filter を構築し、応答 metadata を再検査する。
