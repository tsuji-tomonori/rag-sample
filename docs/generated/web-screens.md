# Web 画面一覧
> 自動生成: `tools/web-inventory.mjs`
>
> 静的解析による推定を含みます。条件付き表示、権限別表示、実行時データ依存の UI は certainty を確認してください。
>
> 読み方: `confirmed` はコードから直接確認できた情報、`inferred` は契約や構造から推定した情報、`unknown` は静的解析だけでは断定できない情報です。

## 画面サマリ

| ID | 画面 | Permission | Feature | Certainty |
| --- | --- | --- | --- | --- |
| `knowledge` | 根拠を登録する | `admin` | [documents](web-features/documents.md) | `confirmed` |
| `inquiry` | 根拠から回答する | `authenticated` | [answers](web-features/answers.md) | `confirmed` |

## 画面ごとの説明

### 根拠を登録する

- View ID: `knowledge`
- Permission: `admin`
- 関連機能: [documents](web-features/documents.md)
- 表示根拠: `frontend/web/design-contract.json` / `frontend/web/src/App.tsx`

### 根拠から回答する

- View ID: `inquiry`
- Permission: `authenticated`
- 関連機能: [answers](web-features/answers.md)
- 表示根拠: `frontend/web/design-contract.json` / `frontend/web/src/App.tsx`
