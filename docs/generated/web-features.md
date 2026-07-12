# Web 機能一覧
> 自動生成: `tools/web-inventory.mjs`
>
> 静的解析による推定を含みます。条件付き表示、権限別表示、実行時データ依存の UI は certainty を確認してください。
>
> 読み方: `confirmed` はコードから直接確認できた情報、`inferred` は契約や構造から推定した情報、`unknown` は静的解析だけでは断定できない情報です。

## 機能別ファイル

| Feature | 説明 | File |
| --- | --- | --- |
| `app` | 共通application shellと状態管理 | [詳細](web-features/app.md) |
| `auth` | local/Cognito認証境界 | [詳細](web-features/auth.md) |
| `documents` | 文書登録とingestion状態 | [詳細](web-features/documents.md) |
| `answers` | 根拠限定回答と引用 | [詳細](web-features/answers.md) |
| `realtime` | AppSync ingestion通知 | [詳細](web-features/realtime.md) |
| `shared` | 複数機能で共有するUIと型 | [詳細](web-features/shared.md) |
