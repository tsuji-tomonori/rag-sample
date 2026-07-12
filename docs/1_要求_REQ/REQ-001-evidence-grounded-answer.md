---
id: REQ-001
status: confirmed
source: docs/rag-engineering-guide.pdf chapters 2, 5, 6
---
# 根拠付き回答

システムは、認可済みの検索結果だけを根拠として回答し、利用した原文へ戻れる引用を返す。

## 受け入れ条件

- 回答は `answer`、`citations`、`request_id`、`status` を持つ。
- 各引用は文書 ID、チャンク ID、原文、順位、検索スコアを持つ。
- 閾値以上の根拠がない場合は `insufficient_evidence` とし、推測で補完しない。

