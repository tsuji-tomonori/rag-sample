# Web feature: answers
> 自動生成: `tools/web-inventory.mjs`
>
> 静的解析による推定を含みます。条件付き表示、権限別表示、実行時データ依存の UI は certainty を確認してください。
>
> 読み方: `confirmed` はコードから直接確認できた情報、`inferred` は契約や構造から推定した情報、`unknown` は静的解析だけでは断定できない情報です。

## 概要

根拠限定回答と引用

## 画面

- `inquiry`: 根拠から回答する (permission: `authenticated`)

## 操作

- `generateGroundedAnswer`: 回答を検証する / `POST /v1/answers` / states: idle, loading, answered, insufficient-evidence, error

## 実装根拠

- `frontend/web/design-contract.json`
- `frontend/web/src/App.tsx`
