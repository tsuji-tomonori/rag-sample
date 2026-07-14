---
id: ARC-005
status: accepted
drives: REQ-014
---
# 製品層をトップレベル所有境界へ集約する

## 品質シナリオ

開発者が変更対象を探索するとき、資産の種類から `backend`、`frontend`、`infra`、`docs`、
`tools` の1つを選べば製品ソースと層固有 test に到達できること。旧 `apps`、`packages`、`src`、
ルート `tests` が残らず、`task verify` が workspace、import、bundle、生成物の path drift を検出する
ことを測定可能な受け入れ条件とする。

## 決定

- Python runtime は `backend/src/app`、その test は `backend/tests` が所有する。
- Web application と TypeScript contract は `frontend/web`、`frontend/contract` が所有する。
- 開発時だけ使う Python/Node generator と validator は `tools` が所有する。
- AWS CDK とその test、bundle script は `infra`、耐久仕様と生成文書は `docs` が所有する。
- ルートには複数所有境界を束ねる manifest、lock、Taskfile、CI と governance 資産だけを置く。

## 失敗モードと制約

主な失敗モードは古い path による CI artifact 欠落、Python import 不成立、Lambda bundle 欠落、
生成文書 drift である。互換 symlink や silent fallback は移行漏れを隠すため採用せず、正規 path を
一括更新し、unit/build/docs/synth/E2E で検出する。

## 代替案とトレードオフ

- `apps/packages` 型 monorepo の維持は ecosystem の慣例に沿うが、今回求められた製品層の発見性を
  満たさないため不採用とした。
- Python package ごとに独立 manifest を置く案は境界が強い一方、lock と横断 command が増える。
  現時点ではルート workspace manifest を維持し、source ownership だけを明確化する。
- 旧 path の symlink は短期互換性を得るが二重の正規表現を生むため不採用とした。

## 運用コストと限界

大規模な path 変更時は workspace lock、生成文書、CI artifact path の同時更新が必要になる。
ルートの orchestration/governance 資産は5分類の製品資産ではないため、意図的な例外として残る。
