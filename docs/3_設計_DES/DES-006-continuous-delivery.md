# DES-006 Continuous delivery

`.github/workflows/deploy.yml` は `workflow_dispatch` の `environment`, `aws-region`, `bootstrap` を入力とする。
workflow-level permission は `contents: read` だけで、`id-token: write` は `needs: verify` の deploy job に
限定する。Environment 単位の concurrency は cancel せず直列化する。

`verify` は `main` を確認し、locked install、Python/TypeScript lint・strict typecheck、unit/contract test、
production build、backend/Web/infra design drift、skill validation、CDK synth を行う。Lambda bundle、Web
dist、CloudFormation template/manifest を1日保持 artifact にし、deploy job は lifecycle script 無効の
Node install後に同じ run の artifact を取得する。

deploy job が読む保護設定は次のとおり。

| 種別 | 名前 | 用途 |
|---|---|---|
| secret | `AWS_DEPLOY_ROLE_ARN` | 通常 CDK deploy 用 OIDC role |
| secret | `AWS_BOOTSTRAP_ROLE_ARN` | `bootstrap=true` のときだけ使う分離 role |
| variable | `AWS_ACCOUNT_ID` | 12桁 account allowlist と CDK target |
| variable | `COGNITO_DOMAIN_PREFIX` | Environment 固有 hosted UI prefix |
| variable | `ALERT_EMAIL` | budget 80% 通知先 |
| variable | `MONTHLY_BUDGET_USD` | 1 USD 以上の月額 budget |
| variable | `CDK_EXECUTION_POLICY_ARN` | bootstrap 時に付与する customer-managed policy |
| variable | `CDK_PERMISSIONS_BOUNDARY_NAME` | bootstrap 時に toolkit roles へ付与する boundary |

preflight は role/policy ARN の account 一致、domain/email/budget、verified asset の存在を検証する。
bootstrap credential は任意 step だけに使い、その後に deploy role を再設定する。両 action は
`allowed-account-ids`、1時間session、既存credentialの明示解除を使う。checkout tokenはGit設定へ
永続化しない。stack discovery は「存在しない」という CloudFormation 応答だけを初回と扱い、認可、
network、形式エラーを初回へ読み替えない。

初回 foundation deploy は非利用 `initial.invalid` callback/origin と全必須 parameter で outputs を得る。
既存 stack または foundation の `WebUrl`, `CognitoUserPoolId`, `CognitoClientId`, `AppSyncGraphqlUrl` から
`VITE_*` を構築して Web を buildし、`--no-previous-parameters` で全 parameter を渡して最終 deploy する。
出力が build 時点から変わった場合は Web を再 build/deployし、二回目でも一致しなければ fail closed とする。
最終 `cdk-outputs.json` と synth template/manifest は14日保持 artifact とする。

generation/embedding model は ARC-003 と stack の制約を正本とし、CD workflow input から IAM 対象を
任意変更できない。Taskfile と `.github/workflows/ci.yml` には deploy command を追加しない。
