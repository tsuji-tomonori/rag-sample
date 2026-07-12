# RAG システム完全実装

- 状態: doing
- 指示: PDF 仕様を実装し、lazunex のバックエンド規約、rag-assist のインフラ・skills・
  作業ログ方式を踏襲する。全ローカル検証を行い、deploy はしない。

## 受け入れ条件

- [ ] 原子的な要求と実装・検証のトレーサビリティがある。
- [ ] 文書取込から ACL 適用検索、引用付き回答までローカルで動く。
- [ ] Web UI が全 API 状態を実データに基づいて扱う。
- [ ] AWS CDK が deploy なしで synth とテストに合格する。
- [ ] 自動設計生成と drift check がバックエンド、フロント、インフラにある。
- [ ] lint、typecheck、unit、integration、E2E、build、smoke が合格する。
- [ ] 公開 GitHub リポジトリへ意図的な単位で commit/push される。

