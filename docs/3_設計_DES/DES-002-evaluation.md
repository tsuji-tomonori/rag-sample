# DES-002 評価 artifact

`uv run app-eval --cases <jsonl> --results <jsonl> --output <json>` は case/result を ID で
結合し、検索、回答可否、引用、latency を集約する。入力は回答本文を必須としないため、機密な
生成文を評価 artifact に複製しない。閾値は dataset profile 側で定義し、production code に
期待文書名や正解語句を埋め込まない。

