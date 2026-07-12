---
id: ARC-001
status: accepted
drives: REQ-001, REQ-002, REQ-003, REQ-004
---
# Port/adapter と二層 RAG

オンライン層を `API -> service -> ports -> adapters` に分割する。取込層は文書を正規化・
チャンク化・埋め込みして `ChunkStore` へ渡す。質問層は認証主体を必須入力とし、store 側で
ACL を hard filter してから sparse/dense の順位を reciprocal-rank fusion する。

ローカル adapter は決定的な feature hashing embedding と token overlap を使う。これは
外部モデル不在でも契約、認可、順位融合、拒否を検証するためであり、本番 fallback ではない。
AWS adapter は同じ port に Bedrock Knowledge Bases と S3 Vectors を接続する。

