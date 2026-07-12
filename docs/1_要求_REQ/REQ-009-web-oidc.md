---
id: REQ-009
status: confirmed
source: AWS Cognito authorization code flow and OIDC specification
---
# Web OIDC 認証

Web は Cognito Hosted UI の authorization code flow で session を取得し、access token を API へ送る。

## 受け入れ条件

- Cognito mode は authority、client ID、callback、logout URL の不足時に起動を拒否する。
- token は session storage に保持し、subject/groups は署名検証対象 profile から表示する。
- Cognito mode では利用者が subject/group を手入力できない。
- local identity は明示した local mode のみで利用する。
- desktop と mobile のブラウザで文書取込から引用表示まで検証する。
