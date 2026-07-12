# Web UI インベントリ概要
> 自動生成: `tools/web-inventory.mjs`
>
> 静的解析による推定を含みます。条件付き表示、権限別表示、実行時データ依存の UI は certainty を確認してください。
>
> 読み方: `confirmed` はコードから直接確認できた情報、`inferred` は契約や構造から推定した情報、`unknown` は静的解析だけでは断定できない情報です。

## この資料で分かること

- 実装済み画面、操作、認証、realtime、主要componentを実装から追跡できます。

## 全体サマリ

| 項目 | 件数 |
| --- | ---: |
| 画面 | 2 |
| 操作 | 2 |
| component | 1 |
| UI control | 15 |

## 初めて見る人向けの導線

1. `web-screens.md` で画面と権限を確認する。
2. `web-features.md` から機能別詳細へ進む。
3. `web-accessibility.md` で操作名と状態を確認する。

## 生成されるファイル

- `web-overview.md`
- `web-screens.md`
- `web-features.md` と `web-features/*.md`
- `web-components.md`
- `web-accessibility.md`
- `web-ui-inventory.json`
