---
id: ARC-004
status: accepted
drives: REQ-013
---
# GitHub Environment と OIDC による CD

## 品質シナリオ

承認済み運用者が `main` の revision、Environment、region を選び、同じ Environment に先行 deploy が
ない状態で実行する。全ローカル相当 gate の成功後だけ AWS OIDC token を取得し、60分以内に CDK
rollback 有効の deployment と output 検証を完了する。同時実行、誤 account、設定欠落、出力不整合は
AWS mutation 前または workflow failure として検出する。

## 決定

- trigger は manual `workflow_dispatch`、job は AWS 権限を持たない `verify` と Environment に属する
  `deploy` に分ける。verified Lambda/Web/synth artifact だけを job 間で渡す。
- Environment は required reviewer と `main` deployment branch rule を持つ。AWS role trust は
  `aud=sts.amazonaws.com` と `sub=repo:tsuji-tomonori/rag-sample:environment:<environment>` の完全一致を
  必須にする。Environment ごとに role と secret を分離する。
- deploy role は対象 account/region の CDK bootstrap role だけを AssumeRole できるよう制限する。
  bootstrap は別 role と customer-managed CloudFormation execution policy を使い、default false とする。
- workflow/Action の改変を supply-chain 境界として扱い、Action は release tag を確認した full commit
  SHA で固定する。AWS OIDC permission は deploy job だけへ付与し、dependency install script は実行しない。
- Cognito/AppSync/CloudFront の値は stack output が正本である。既存 stack は現在 output から Web を build、
  初回だけ非利用 URL で foundation を作って output を得た後に production Web を配備する。deployment に
  よる endpoint 置換を検出した場合は同じ run で Web を再 build/deploy する。

## 根拠

- [参照した rag-assist deploy workflow](https://github.com/tsuji-tomonori/rag-assist/blob/main/.github/workflows/deploy.yml)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS configure-aws-credentials action](https://github.com/aws-actions/configure-aws-credentials)

## 代替とトレードオフ

- `main` push ごとの自動 deploy は承認と対象 Environment の選択を失うため採用しない。
- repository secret の access key は長期 credential の漏えいと rotation 負担があるため採用しない。
- verify/deploy の単一 job は dependency/build step まで OIDC permission を持つため採用しない。job 間 artifact
  転送の時間と一時 storage cost を受け入れる。
- stack output を GitHub variables へ複製する方式は初回に循環依存し drift するため採用しない。初回だけ
  CDK deploy が二回走り、一回目と二回目の間は Web を利用開始しない運用制約を受け入れる。

## 前提・制約

GitHub Environment、OIDC provider、trust/permission policy はこの application stack の外部 bootstrap
境界であり、OPS-004 に従って事前設定する。GitHub-hosted runner、Artifact service、AWS STS/CDK endpoint
の障害時は deploy せず失敗する。実 AWS role の有効権限と reviewer 設定はローカル test では検証できず、
運用監査対象とする。
