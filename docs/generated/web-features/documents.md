# Web feature: documents
> 自動生成: `tools/web-inventory.mjs`
>
> 静的解析による推定を含みます。条件付き表示、権限別表示、実行時データ依存の UI は certainty を確認してください。
>
> 読み方: `confirmed` はコードから直接確認できた情報、`inferred` は契約や構造から推定した情報、`unknown` は静的解析だけでは断定できない情報です。

## 概要

文書登録とingestion状態

## 画面

- `knowledge`: 根拠を登録する (permission: `admin`)

## 操作

- `ingestDocument`: 文書を取り込む / `POST /v1/documents` / states: idle, loading, success, permission-denied, error

## 実装根拠

- `frontend/web/design-contract.json`
- `frontend/web/src/App.tsx`
