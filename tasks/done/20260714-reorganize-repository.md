# リポジトリ構成の再編

- 状態: done
- 指示: 分散している `apps`、`packages`、`src`、`tests` を見直し、製品資産を
  `backend`、`frontend`、`infra`、`docs`、`tools` に集約する。

## 受け入れ条件

- [x] 製品ソースと層固有テストが5つの所有ディレクトリのいずれかに配置されている。
- [x] 旧 `apps/`、`packages/`、`src/`、ルート `tests/` が残っていない。
- [x] workspace、Python import、生成器、Lambda bundle、CDK、CI、文書の参照が新パスへ追随する。
- [x] 自動生成設計を再生成し、トレーサビリティと運用手順が新構成を示す。
- [x] `task verify`、`task e2e`、backend 完了 gate が実行され、結果が報告される。

## 検証証跡

- `task verify`: 成功。
- `task e2e`: 2件成功。
- `UV_CACHE_DIR=/tmp/uv-cache uv run pre-commit run --all-files`: 成功。
- 詳細と途中の失敗は `reports/working/20260714-0913-reorganize-repository.md` を参照。
