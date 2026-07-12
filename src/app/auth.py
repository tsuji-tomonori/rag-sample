from dataclasses import dataclass
from typing import Any, Protocol, cast

import jwt
from jwt import InvalidTokenError, PyJWKClient

from app.domain import Principal


class Authenticator(Protocol):
    def authenticate(self, token: str, asserted_groups: frozenset[str]) -> Principal: ...


class SigningKey(Protocol):
    key: Any


class SigningKeyClient(Protocol):
    def get_signing_key_from_jwt(self, token: str) -> SigningKey: ...


class AuthenticationFailedError(ValueError):
    """Raised when a credential cannot be trusted."""


class LocalAuthenticator:
    """Explicit local-development identity adapter; never selected for AWS storage."""

    def authenticate(self, token: str, asserted_groups: frozenset[str]) -> Principal:
        subject = token.strip()
        if not subject:
            raise AuthenticationFailedError("subject is empty")
        return Principal(subject=subject, groups=asserted_groups)


@dataclass(frozen=True, slots=True)
class CognitoAuthenticatorConfig:
    region: str
    user_pool_id: str
    client_id: str

    @property
    def issuer(self) -> str:
        return f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"

    @property
    def jwks_url(self) -> str:
        return f"{self.issuer}/.well-known/jwks.json"


class CognitoAuthenticator:
    def __init__(
        self,
        config: CognitoAuthenticatorConfig,
        signing_keys: SigningKeyClient | None = None,
    ) -> None:
        self._config = config
        self._signing_keys = signing_keys or cast(
            "SigningKeyClient", PyJWKClient(config.jwks_url, cache_jwk_set=True, lifespan=3600)
        )

    def authenticate(self, token: str, asserted_groups: frozenset[str]) -> Principal:
        del asserted_groups
        try:
            signing_key = self._signing_keys.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=self._config.issuer,
                options={
                    "verify_aud": False,
                    "require": ["exp", "iat", "iss", "sub", "token_use", "client_id"],
                },
            )
            claim_map = _claim_map(claims)
            if claim_map.get("token_use") != "access":
                raise AuthenticationFailedError("only Cognito access tokens are accepted")
            if claim_map.get("client_id") != self._config.client_id:
                raise AuthenticationFailedError("Cognito client_id does not match")
            subject = claim_map.get("sub")
            if not isinstance(subject, str) or not subject:
                raise AuthenticationFailedError("Cognito subject is missing")
            groups = _groups(claim_map.get("cognito:groups", []))
            return Principal(subject=subject, groups=groups)
        except AuthenticationFailedError:
            raise
        except (InvalidTokenError, OSError, ValueError) as exc:
            raise AuthenticationFailedError("Cognito access token verification failed") from exc


def _claim_map(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise AuthenticationFailedError("JWT claims are invalid")
    object_map = cast("dict[object, object]", value)
    if not all(isinstance(key, str) for key in object_map):
        raise AuthenticationFailedError("JWT claim keys are invalid")
    return cast("dict[str, Any]", object_map)


def _groups(value: object) -> frozenset[str]:
    if not isinstance(value, list):
        raise AuthenticationFailedError("cognito:groups must be a list")
    group_values = cast("list[object]", value)
    if not all(isinstance(group, str) and group for group in group_values):
        raise AuthenticationFailedError("cognito:groups must contain strings")
    return frozenset(cast("list[str]", group_values))
