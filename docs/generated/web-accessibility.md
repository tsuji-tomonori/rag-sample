# Web UI 操作説明一覧
> 自動生成: `tools/web-inventory.mjs`
>
> 静的解析による推定を含みます。条件付き表示、権限別表示、実行時データ依存の UI は certainty を確認してください。
>
> 読み方: `confirmed` はコードから直接確認できた情報、`inferred` は契約や構造から推定した情報、`unknown` は静的解析だけでは断定できない情報です。

## この資料で分かること

- 操作可能要素の表示名、推定accessible name、静的解析確度を確認できます。

## 機能別サマリ

| Feature | 操作数 |
| --- | ---: |
| `app` | 15 |

## UI 操作説明

| ID | Element | Label | Accessible name | Certainty |
| --- | --- | --- | --- | --- |
| `UI-001` | `input` | setSubject(event.target.value)} placeholder="必須" /> |  setSubject(event.target.value)} placeholder="必須" /> | `confirmed` |
| `UI-002` | `input` | setGroups(event.target.value)} placeholder="カンマ区切り" /> |  setGroups(event.target.value)} placeholder="カンマ区切り" /> | `confirmed` |
| `UI-003` | `button` | サインアウト | サインアウト | `confirmed` |
| `UI-004` | `button` | Cognitoでサインイン | Cognitoでサインイン | `confirmed` |
| `UI-005` | `form` | void ingest(event)}> |  void ingest(event)}>
             | `confirmed` |
| `UI-006` | `input` | setDocument({ ...document, document_id: event.target.value })} /> |  setDocument({ ...document, document_id: event.target.value })} /> | `confirmed` |
| `UI-007` | `input` | setDocument({ ...document, version: event.target.value })} /> |  setDocument({ ...document, version: event.target.value })} /> | `confirmed` |
| `UI-008` | `input` | setDocument({ ...document, title: event.target.value })} /> |  setDocument({ ...document, title: event.target.value })} /> | `confirmed` |
| `UI-009` | `input` | setDocument({ ...document, owner_subject: event.target.value })} placeholder="空欄なら現在の利用者" /> |  setDocument({ ...document, owner_subject: event.target.value })} placeholder="空欄なら現在の利用者" /> | `confirmed` |
| `UI-010` | `input` | setDocument({ ...document, allowed_groups: event.target.value.split(",").map(item => item.trim()).filter(Boolean) })} /> |  setDocument({ ...document, allowed_groups: event.target.value.split(",").map(item => item.trim()).filter(Boolean) })} /> | `confirmed` |
| `UI-011` | `textarea` | setDocument({ ...document, text: event.target.value })} /> |  setDocument({ ...document, text: event.target.value })} /> | `confirmed` |
| `UI-012` | `button` | {busy === "ingesting" ? "索引を構築中..." : "文書を取り込む"} | {busy === "ingesting" ? "索引を構築中..." : "文書を取り込む"} | `confirmed` |
| `UI-013` | `form` | void ask(event)}> |  void ask(event)}>
             | `confirmed` |
| `UI-014` | `textarea` | setQuestion(event.target.value)} placeholder="登録した資料について質問してください" /> |  setQuestion(event.target.value)} placeholder="登録した資料について質問してください" />
             | `confirmed` |
| `UI-015` | `button` | {busy === "answering" ? "根拠を照合中..." : "回答を検証する"} | {busy === "answering" ? "根拠を照合中..." : "回答を検証する"} | `confirmed` |

## 仕様書での読み替え

- `confirmed` はソース上の表示テキストまたはARIA属性です。
- `inferred` はlabel構造やcontractからの推定です。
