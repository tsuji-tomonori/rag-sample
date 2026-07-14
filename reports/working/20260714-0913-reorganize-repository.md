# リポジトリ構成再編 作業報告

## 指示と要求

- `apps`、`src` などに分散した資産を `backend/frontend/infra/docs/tools` に集約する。
- AGENTS.md に従い、作業タスク、耐久文書、traceability、実行結果を同じ変更で保守する。
- deploy は行わない。

## 確認済みの開始状態

- `git status --short`: 変更なし。
- 製品コードは `src/app`、`apps/web`、`packages/contract`、`infra` に分散していた。
- Python の生成ツールは `src/tools`、Node の生成ツールはルート `tools` に分散していた。
- Python test はルート `tests`、Web/contract/infra test は各package内にあった。

## 決定

- `backend/src/app` と `backend/tests` を backend の所有境界とする。
- `frontend/web` と `frontend/contract` を frontend の所有境界とする。
- Python CLI/生成器は `tools/python`、Node 生成器は既存 `tools` 配下へ集約する。
- ルートにはモノレポ共通設定、lock、Taskfile、CI、skills/tasks/reports を残す。
- 互換用 symlink や旧パス fallback は作らず、全参照を一度に更新する。

## コマンドと実結果

- `git status --short`: 成功、開始時の未コミット変更なし。
- `find` / `git ls-files` / `rg`: 成功、移行対象とパス参照を確認。
- `git mv ...`: `.git/index.lock` が read-only のため失敗。作業ツリーは未変更だったため、通常の
  `mv` で同じ移動を行った。Git は内容同一性から rename を検出できる。
- 1回目の `task docs:generate`: 失敗。移動前の npm workspace link が旧pathを指していた。
- `npm install --ignore-scripts`: 成功。workspace link を `frontend/*` へ再構築し、audit 0件。
- 2回目の `task docs:generate`: 成功。API/Web/infraの実装由来設計を新pathで生成した。
- `uv run pytest backend/tests/test_repository_layout.py backend/tests/test_lazunex_layout.py`:
  7件成功。
- cache指定なしの直接 `uv run ...`: user cache内 `.git` がread-onlyで失敗。以後 Taskfile と同じ
  `UV_CACHE_DIR=/tmp/uv-cache` を使用した。
- 1回目の Pyright: `app.core` に `__init__.py` がなくtyped package境界を解決できず9件失敗。
  `backend/src/app/core/__init__.py` を追加後、0 errorsで成功。
- 1回目の `task verify`: Ruffが新規2箇所のformat違反を検出して失敗。修正した。
- 2回目の `task verify`: lint、型検査、Python 33件、contract 2件、Web 6件、infra 7件、build
  までは成功。追加したbackend sourceでLambda asset hashが変わり、infra snapshot driftで失敗。
- `task docs:generate`: 成功。最終Lambda asset hashに合わせてsnapshot/inventoryを再生成した。
- 最終 `task verify`: 成功。Ruff/ESLint、Pyright 0件、Mypy 95 source、全TypeScript型検査、
  Python 33件、contract 2件、Web 6件、infra 7件、全build、全docs drift、8 skills validation、
  CDK synthが成功した。CDKの未設定feature flag 81件はwarningでありsynthはexit 0。
- `task e2e`: desktop/mobileの2件が成功した。`NO_COLOR`/`FORCE_COLOR` warningのみ。
- `UV_CACHE_DIR=/tmp/uv-cache uv run pre-commit run --all-files`: Ruff check/formatとも成功。
- `git diff --check` と所有ルート監査: 成功。5正規rootが存在し、4旧rootは存在しない。

## 成果物

- runtime/test: `backend/src/app`, `backend/tests`
- Web/contract: `frontend/web`, `frontend/contract`
- tooling: `tools/python`, `tools/web-inventory.mjs`, `tools/infra-inventory`
- path追随: Python/npm workspace、Taskfile、Lambda bundle、CDK、GitHub Actions、生成器、lockfile
- durable docs: REQ-014、ARC-005、DES-007、OPS-001、TRACEABILITY、README、生成設計
- regression guard: `backend/tests/test_repository_layout.py`

## Instruction fit

- 製品資産を指定された5所有境界へ集約し、旧root互換fallbackは追加していない。
- behavior/config変更としてREQ/ARC/DES/OPS/traceabilityと生成設計を同期した。
- Taskfile target本体を確認し、local verification、E2E、synthだけを実行した。
- deploy commandは実行していない。
- 失敗した試行を成功として扱わず、最終成功runを別に記録した。

## 未解決リスク

- Git indexがread-onlyのためcommit/stageは行っていない。作業ツリー上では削除+追加として表示されるが、
  commit時にGitのrename detection対象となる。
- CDKは未設定feature flag 81件をwarning表示する。今回のpath再編とは独立し、synthは成功している。
- deployは明示的にskipした。AGENTS.mdで禁止され、local refactorの検証範囲外である。
