---
id: ARC-003
status: accepted
drives: REQ-002, REQ-004
---
# AWS 標準 Knowledge Base

東京リージョンを前提に、暗号化 S3 原文、Titan Text Embeddings V2 (1024 dimensions)、
S3 Vectors index、標準 Bedrock Knowledge Base、S3 data source を CDK で構成する。
Managed Knowledge Base ではなく `S3_VECTORS` を明示する。データ資源は誤削除を防ぐため retain、
public access は全面拒否し、Knowledge Base role は原文 prefix、embedding model、対象 vector
index のみに絞る。deploy は本リポジトリのローカル検証に含めない。

