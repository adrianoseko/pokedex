import os
import logging
from typing import Dict, List, Optional, Set, Protocol

import httpx

# Module-level logger
logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

# External API
BASE_URL = "https://pokeapi.co/api/v2/pokemon"

# Environment configuration keys
ENV_ALLOWED_ORIGINS = "ALLOWED_ORIGINS"  # comma-separated allowed frontend origins
ENV_SECRET_PROVIDER = "SECRET_PROVIDER"  # which secret provider to use (e.g. env, vault)
ENV_API_TOKENS = "POKEAPI_TOKENS"  # comma-separated rotating tokens stored in env as a fallback


class PokeAPIError(Exception):
    """Raised when a call to the upstream PokeAPI fails."""


class SecretProvider(Protocol):
    """Protocol for secret providers to allow rotation and retrieval.

    Implementations can fetch secrets from environment variables, a vault, or other secure
    storage. The library provides an EnvSecretProvider as a simple fallback.
    """

    def get_latest_secret(self) -> Optional[str]:
        """Return the current secret/token or None if not available."""

    def get_all_secrets(self) -> List[str]:
        """Return a list of all known secrets (for verification/rotation purposes)."""


class EnvSecretProvider:
    """Simple secret provider that reads rotating secrets from an environment variable.

    Environment variable value should be a comma-separated list of secrets with the most
    current/active secret first, e.g.: "secret_current,secret_previous1,secret_previous2".

    This provider is intentionally simple and should only be used in development or as
    a fallback when a proper secrets manager isn't configured.
    """

    def __init__(self, env_key: str = ENV_API_TOKENS):
        self._env_key = env_key

    def get_all_secrets(self) -> List[str]:
        raw = os.getenv(self._env_key, "")
        if not raw:
            return []
        # split and strip, preserve ordering (most recent first)
        return [s.strip() for s in raw.split(",") if s.strip()]

    def get_latest_secret(self) -> Optional[str]:
        all_secrets = self.get_all_secrets()
        return all_secrets[0] if all_secrets else None


def get_secret_provider() -> SecretProvider:
    """Return an instance of SecretProvider based on environment configuration.

    Currently supports:
    - "env": reads comma-separated tokens from ENV_API_TOKENS

    Additional providers (e.g. VaultSecretProvider) can be added and selected via
    the ENV_SECRET_PROVIDER environment variable.
    """
    provider = os.getenv(ENV_SECRET_PROVIDER, "env").lower()
    if provider == "env":
        return EnvSecretProvider()

    # Placeholder for future secure storage integration (e.g. HashiCorp Vault, AWS Secrets Manager)
    # For now, fall back to the env provider and log a warning.
    logger.warning("Unsupported SECRET_PROVIDER '%s', falling back to EnvSecretProvider.", provider)
    return EnvSecretProvider()


def allowed_origins_from_env() -> Set[str]:
    """Parse allowed origins from environment variable and return a set.

    Environment variable ALLOWED_ORIGINS should be a comma-separated list of origin URLs.
    If not set, the returned set is empty which indicates no origins are explicitly allowed.
    """
    raw = os.getenv(ENV_ALLOWED_ORIGINS, "")
    if not raw:
        return set()
    return {o.strip() for o in raw.split(",") if o.strip()}


def is_origin_allowed(origin: Optional[str]) -> bool:
    """Determine whether the provided origin is allowed.

    This utility does not enforce CORS by itself; it is meant to be used by the HTTP
    layer (framework) to decide whether to allow a request from a given origin.
    """
    if not origin:
        return False
    allowed = allowed_origins_from_env()
    # If no allowed origins have been configured, default to False (deny) per security guidance.
    return origin in allowed


async def _create_client_with_optional_auth() -> httpx.AsyncClient:
    """Create an AsyncClient and attach Authorization header if a token is available.

    The authorization header is only attached when a secret is present from the configured
    secret provider. This allows future rotation of tokens without changing call sites.
    """
    provider = get_secret_provider()
    token = provider.get_latest_secret()
    headers = {"Authorization": f"Bearer {token}"} if token else None

    # Use a conservative timeout and follow standard behavior similar to simple usage.
    timeout = httpx.Timeout(10.0, connect=5.0)
    if headers:
        return httpx.AsyncClient(timeout=timeout, headers=headers)
    return httpx.AsyncClient(timeout=timeout)


async def fetch_pokemon_data(limit: int, offset: int) -> List[Dict]:
    """Fetch a list of Pokemon metadata from the PokeAPI.

    Returns the raw list from the 'results' field of the PokeAPI response.
    This function preserves the original behavior but adds clearer typing, logging,
    and structured error handling while remaining compatible with existing callers.
    """
    if limit < 0 or offset < 0:
        raise ValueError("limit and offset must be non-negative integers")

    async with await _create_client_with_optional_auth() as client:
        try:
            response = await client.get(BASE_URL, params={"limit": limit, "offset": offset})
            response.raise_for_status()
            data = response.json()
            # Preserve original behavior: return the 'results' list
            return data["results"]
        except httpx.HTTPStatusError as exc:
            # Wrap upstream errors to provide clearer context to callers
            logger.exception("PokeAPI returned an HTTP error for list fetch: %s", exc)
            raise PokeAPIError("Failed to fetch Pokemon list from PokeAPI") from exc
        except httpx.HTTPError as exc:
            logger.exception("Network error when fetching Pokemon list: %s", exc)
            raise PokeAPIError("Network error while contacting PokeAPI") from exc
        except KeyError as exc:
            # Unexpected response shape
            logger.exception("Unexpected PokeAPI response shape: missing 'results' key")
            raise PokeAPIError("Unexpected response from PokeAPI: missing 'results'") from exc


async def fetch_pokemon_details(id: int) -> Dict:
    """Fetch detailed information for a single Pokemon by id.

    Preserves the original behavior and returns the parsed JSON object from the
    PokeAPI response for the given Pokemon id.
    """
    if id is None:
        raise ValueError("id must be provided")

    async with await _create_client_with_optional_auth() as client:
        try:
            response = await client.get(f"{BASE_URL}/{id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            logger.exception("PokeAPI returned an HTTP error for details fetch (id=%s): %s", id, exc)
            raise PokeAPIError(f"Failed to fetch Pokemon details for id {id}") from exc
        except httpx.HTTPError as exc:
            logger.exception("Network error when fetching Pokemon details (id=%s): %s", id, exc)
            raise PokeAPIError("Network error while contacting PokeAPI") from exc
