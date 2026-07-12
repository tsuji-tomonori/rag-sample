---
id: REQ-007
status: confirmed
source: AWS Cognito JWT verification and API Gateway JWT authorizer documentation
---
# Cognito access token 認証

AWS runtime は Cognito が発行した検証済み access token の subject と groups だけを認証主体に使う。

## 受け入れ条件

- RS256署名、issuer、expiration、`token_use=access`、`client_id`、`sub` を検証する。
- group は署名済み `cognito:groups` claim から取得し、利用者指定 header を無視する。
- JWKS は Cognito issuer から取得して cache し、取得・検証失敗時は 401 とする。
- AWS storage と local authentication の組合せを設定時に拒否する。
