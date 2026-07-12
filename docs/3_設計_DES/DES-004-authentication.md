# DES-004 認証境界

local mode は開発専用で bearer payload を subject、`X-Principal-Groups` を groups として扱う。
AWS mode は Cognito JWT authorizer と backend `CognitoAuthenticator` の二層で検証する。access token
のみを許可し、issuer は region/user pool ID、client ID は app client 設定から構築する。JWT の
header/payload を decode しただけでは信頼せず、JWKS の `kid` に対応する RS256署名を検証する。
