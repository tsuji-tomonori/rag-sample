---
id: OPS-004
status: confirmed
---
# GitHub Actions CD 運用

## Environment の事前設定

`dev` など対象ごとに GitHub Environment を作り、required reviewers と deployment branch `main` のみを
許可する rule を設定する。DES-006 の variables/secrets を Environment scope で登録する。production と
development で role、Cognito domain prefix、通知先、budget を共有しない。

AWS IAM OIDC provider は URL `https://token.actions.githubusercontent.com`、audience
`sts.amazonaws.com` とする。各 role の trust policy は少なくとも次の二条件を完全一致で検証する。

```json
{
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:tsuji-tomonori/rag-sample:environment:<environment>"
  }
}
```

通常 role は対象 account/region の `cdk-hnb659fds` deploy/file-publishing/lookup role だけを AssumeRole
できる policy とする。CloudFormation execution role はこの stack が使うサービス・対象 Environment に
限定した customer-managed policy と `CDK_PERMISSIONS_BOUNDARY_NAME` の boundary を使用し、
`AdministratorAccess` を指定しない。bootstrap role は通常 role と分離し、`bootstrap=true` の承認時だけ
使用する。application Lambda/Knowledge Base role の Bedrock model resource は stack test が固定 ARN と
wildcard 不在を検査する。

## 実行

GitHub Actions の `Deploy RAG Engineering` で ref `main`、Environment、AWS region を選ぶ。通常は
`bootstrap=false` とする。初回 toolkit 作成が必要な場合だけ bootstrap role/policy を監査し、reviewer
承認のうえ `true` にする。ローカル shell、Taskfile、CI から bootstrap/deploy を実行しない。

workflow は verify 完了後に Environment 承認を待ち、account/config を検証して deploy する。初回は
foundation と production Web の二回、既存 stack は通常一回の CDK deploy を行う。CloudFormation が
identity endpoint を置換したときだけ Web 同期の追加 deploy を行う。初回 foundation 完了から最終 output
検証までは Web を利用開始しない。

## 証跡・障害・復旧

- verify bundle は1日、最終 template/manifest/`cdk-outputs.json` は14日 artifact として保持する。
- branch、Environment、設定、artifact、OIDC、stack discovery、output 一致のどれかが失敗した run は
  deploy 完了として扱わない。「stack does not exist」以外の discovery failure は再試行せず調査する。
- CDK/CloudFormation rollback は有効のままとする。失敗時は CloudFormation events と Actions log を確認し、
  原因を修正して `main` へ反映後に再実行する。既知の revision へ戻す場合も `main` で revert して配備する。
- retained S3/KMS/vector/log/Cognito 資源を cleanup しない。削除や migration は別途明示承認を得る。
- GitHub Environment rule、OIDC trust、role permission は repository 外部状態なので、変更時と定期監査時に
  exact repository/environment/account/region、reviewer、CloudTrail AssumeRoleWithWebIdentity を確認する。
