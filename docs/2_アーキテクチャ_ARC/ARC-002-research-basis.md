---
id: ARC-002
status: accepted
drives: REQ-001, REQ-003
---
# 検索・生成方式の研究根拠

- Lewis et al. (2020), *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*, arXiv:2005.11401: 外部検索と生成を分離し、回答時の根拠を更新可能にする。
- Karpukhin et al. (2020), *Dense Passage Retrieval for Open-Domain Question Answering*, arXiv:2004.04906: 質問と passage の dense retrieval を独立経路にする。
- Cormack et al. (2009), *Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods*: スコア尺度の異なる順位を RRF で融合する。
- Bruch et al. (2022), *An Analysis of Fusion Functions for Hybrid Retrieval*, arXiv:2210.11934: RRF の定数依存性を認識し、評価 dataset で融合方式を再調整する。
- Asai et al. (2023), *Self-RAG*, arXiv:2310.11511: 根拠不足時の無条件生成を避け、取得・生成品質を別々に評価する。

初期実装は比較可能な RRF (`k=60`) を採用する。これは最終最適値ではなく、評価セットで
convex combination と比較し、変更時は pipeline version を更新する。

