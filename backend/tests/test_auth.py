from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.auth import AuthenticationFailedError, CognitoAuthenticator, CognitoAuthenticatorConfig


class StaticSigningKey:
    def __init__(self, key: object) -> None:
        self.key = key


class StaticSigningKeyClient:
    def __init__(self, key: object) -> None:
        self._key = key

    def get_signing_key_from_jwt(self, token: str) -> StaticSigningKey:
        del token
        return StaticSigningKey(self._key)


def _token(private_key: object, **overrides: Any) -> str:
    now = datetime.now(UTC)
    claims: dict[str, Any] = {
        "iss": "https://cognito-idp.ap-northeast-1.amazonaws.com/pool-1",
        "sub": "user-1",
        "client_id": "client-1",
        "token_use": "access",
        "cognito:groups": ["support"],
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }
    claims.update(overrides)
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": "key-1"})


def test_cognito_authenticator_verifies_access_token_and_ignores_asserted_groups() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    authenticator = CognitoAuthenticator(
        CognitoAuthenticatorConfig("ap-northeast-1", "pool-1", "client-1"),
        StaticSigningKeyClient(private_key.public_key()),
    )
    principal = authenticator.authenticate(
        _token(private_key), frozenset({"attacker-asserted-group"})
    )
    assert principal.subject == "user-1"
    assert principal.groups == frozenset({"support"})


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"token_use": "id"}, "access tokens"),
        ({"client_id": "other"}, "client_id"),
        ({"iss": "https://attacker.invalid"}, "verification failed"),
    ],
)
def test_cognito_authenticator_rejects_invalid_claims(
    overrides: dict[str, str], message: str
) -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    authenticator = CognitoAuthenticator(
        CognitoAuthenticatorConfig("ap-northeast-1", "pool-1", "client-1"),
        StaticSigningKeyClient(private_key.public_key()),
    )
    with pytest.raises(AuthenticationFailedError, match=message):
        authenticator.authenticate(_token(private_key, **overrides), frozenset())
