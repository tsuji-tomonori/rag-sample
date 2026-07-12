---
id: REQ-004
status: confirmed
source: docs/rag-engineering-guide.pdf sections 3.2-3.8, 8.4, 8.7
---
# 追跡可能な文書取込

システムは、文書の版、原文、チャンク、ACL、取込結果を追跡できる形で保存する。

## 受け入れ条件

- 取込入力に文書 ID、版、タイトル、本文、所有者、許可 group を含める。
- 正規化後に空の本文は拒否する。
- 取込、検索、回答の監査イベントに request ID、actor、結果件数を残す。

