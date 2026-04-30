from typing import List, Optional, Sequence, Tuple
import os
import logging
from functools import lru_cache
from urllib.parse import urlparse
from fnmatch import fnmatch
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app import models

"""CRUD and environment helpers for Pokedex API

Design goals and patterns applied:
- Repository pattern for DB access (PokemonRepository)
- Strategy/Provider pattern for secrets (SecretProvider + EnvSecretProvider)
- Single responsibility: repository does not log/catch DB errors; callers may
  handle/log DB-specific exceptions.
- Defensive input normalization and validation for origin checks and
  pagination, without changing the established external behaviour for
  normal inputs.
- Clear, domain-specific exception types for secret retrieval.
"""

DEFAULT_SKIP: int = 0
DEFAULT_LIMIT: int = 100
# A hard cap to protect against accidental huge queries when upstream
# validation is absent. This is conservative and chosen to preserve
# typical behaviour while preventing resource exhaustion.
MAX_LIMIT: int = 1000

__all__ = [
    "get_pokemons",
    "get_pokemon",
    "PokemonRepository",
    "SecretManager",
    "SecretNotFoundError",
    "get_allowed_origins",
    "clear_allowed_origins_cache",
    "is_origin_allowed",
]

logger = logging.getLogger(__name__)


# -----------------------------
# Repository
# -----------------------------
class PokemonRepository:
    """Repository encapsulating read-only Pokemon operations.

    Responsibilities:
    - Provide a focused API for reading Pokemon records.
    - Validate and normalize pagination inputs to avoid surprising DB
      queries (non-negative skip, reasonable positive limit capped at
      MAX_LIMIT). Validation is implemented as normalization rather than
      raising to preserve typical behaviour for callers that supply
      normal values.

    Note: The repository does not swallow SQLAlchemy errors. Callers can
    catch and log SQLAlchemyError to maintain a single logging boundary.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self, skip: int = DEFAULT_SKIP, limit: int = DEFAULT_LIMIT) -> List[models.Pokemon]:
        """Return a list of Pokemon records.

        Behaviour preserved: delegates directly to SQLAlchemy query with
        offset/limit and .all().

        Defensive normalization applied:
        - Negative skip coerced to DEFAULT_SKIP (0)
        - Non-positive limit coerced to DEFAULT_LIMIT
        - Limit is capped to MAX_LIMIT to guard against large result sets
          being loaded into memory via .all().
        """
        # Normalize pagination values rather than failing callers.
        normalized_skip = skip if isinstance(skip, int) and skip >= 0 else DEFAULT_SKIP
        if not isinstance(limit, int) or limit <= 0:
            normalized_limit = DEFAULT_LIMIT
        else:
            normalized_limit = min(limit, MAX_LIMIT)

        # Preserve the original behaviour: return a materialized list.
        return self._db.query(models.Pokemon).offset(normalized_skip).limit(normalized_limit).all()

    def get(self, pokemon_id: int) -> Optional[models.Pokemon]:
        """Return a single Pokemon by its ID, or None if not found.

        Behaviour preserved: uses .filter(...).first() as before.
        """
        return self._db.query(models.Pokemon).filter(models.Pokemon.id == pokemon_id).first()


# -----------------------------
# Thin wrapper helpers
# -----------------------------
def get_pokemons(db: Session, skip: int = DEFAULT_SKIP, limit: int = DEFAULT_LIMIT, repo: Optional[PokemonRepository] = None) -> List[models.Pokemon]:
    """Compatibility wrapper that returns a list of Pokemon.

    Accepts an optional PokemonRepository to avoid repeated instantiation
    in call sites and to facilitate testing (dependency injection).

    Errors: logs and re-raises SQLAlchemyError (database-specific errors)
    while allowing other unexpected exceptions to bubble up without
    being swallowed.
    """
    repository = repo if repo is not None else PokemonRepository(db)
    try:
        return repository.list(skip=skip, limit=limit)
    except SQLAlchemyError:
        logger.exception("Failed to fetch pokemons (skip=%s, limit=%s)", skip, limit)
        raise


def get_pokemon(db: Session, pokemon_id: int, repo: Optional[PokemonRepository] = None) -> Optional[models.Pokemon]:
    """Compatibility wrapper that returns a single Pokemon by id.

    Accepts optional repository for DI/testing.
    """
    repository = repo if repo is not None else PokemonRepository(db)
    try:
        return repository.get(pokemon_id=pokemon_id)
    except SQLAlchemyError:
        logger.exception("Failed to fetch pokemon with id=%s", pokemon_id)
        raise


# -----------------------------
# Origin/CORS helpers
# -----------------------------

def _normalize_origin(origin: str) -> str:
    """Normalize an origin string for robust comparison.

    Normalization steps:
    - Strip surrounding whitespace and trailing slashes
    - Parse using urllib.parse to canonicalize scheme and netloc
    - Lowercase scheme and hostname for case-insensitive comparison
    - Preserve explicit port when present

    If parsing fails in some unexpected way, a best-effort stripped and
    lower-cased origin is returned.
    """
    if not origin:
        return ""

    origin = origin.strip()
    # Remove trailing slash(es) for stable comparison
    origin = origin.rstrip("/")

    try:
        parsed = urlparse(origin)
        scheme = (parsed.scheme or "http").lower()
        host = parsed.hostname.lower() if parsed.hostname else ""
        port = f":{parsed.port}" if parsed.port else ""
        normalized = f"{scheme}://{host}{port}"
        return normalized
    except Exception:
        # Best-effort fallback; do not mask exceptions higher up.
        return origin.lower()


@lru_cache(maxsize=1)
def get_allowed_origins() -> Tuple[str, ...]:
    """Return a tuple of normalized allowed origins read from
    POKEDEX_ALLOWED_ORIGINS.

    The environment variable should be a comma-separated list of
    origins, e.g. 'https://app.example.com,https://admin.example.com'.
    If not set a sensible default for local development is provided.

    Note: cached for performance. If you need to pick up environment
    changes at runtime, call clear_allowed_origins_cache().
    """
    raw = os.getenv("POKEDEX_ALLOWED_ORIGINS", "http://localhost:3000")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    normalized = tuple(_normalize_origin(o) for o in origins)
    logger.debug("Allowed origins loaded: %s", normalized)
    return normalized


def clear_allowed_origins_cache() -> None:
    """Clear the cache for allowed origins so the next call will re-read
    the environment variable.

    This allows operators to programmatically reload allowed origins
    without restarting the process if the deployment model supports
    updating environment variables at runtime (note: many platforms do
    not support that safely; prefer a configuration service).
    """
    try:
        get_allowed_origins.cache_clear()
    except AttributeError:
        # If lru_cache internals differ or cache_clear isn't present, ignore
        logger.debug("get_allowed_origins has no cache_clear available")


def is_origin_allowed(origin: str) -> bool:
    """Check whether the given origin is allowed.

    Matching rules:
    - Normalizes both configured origins and the incoming origin to
      provide robust matching against trivial differences (trailing
      slashes, capitalization, explicit default ports).
    - Supports glob-style wildcard patterns in the configured origins
      (e.g. 'https://*.example.com'). Use this intentionally; default
      behaviour remains exact match when no wildcard is present.
    """
    if not origin:
        return False

    normalized_input = _normalize_origin(origin)
    allowed = get_allowed_origins()

    # Exact membership or wildcard patterns
    for pattern in allowed:
        if pattern == normalized_input:
            return True
        # Treat entries containing '*' as glob patterns
        if "*" in pattern and fnmatch(normalized_input, pattern):
            return True
    return False


# -----------------------------
# Secrets management
# -----------------------------
class SecretError(RuntimeError):
    """Base exception for secret retrieval errors."""


class SecretNotFoundError(SecretError):
    """Raised when a requested secret cannot be found by the configured
    provider."""


class SecretProvider:
    """Abstract secret provider interface (Strategy pattern).

    Concrete providers should implement get_secret(name).
    """

    def get_secret(self, name: str) -> str:  # pragma: no cover - trivial contract
        raise NotImplementedError


class EnvSecretProvider(SecretProvider):
    """Simple environment variable backed provider.

    Note: Reading secrets from environment variables is suitable for
    simple deployments, local development or CI. For production we
    recommend integrating with a proper secrets store and a provider
    implementation that supports rotation and auditability.
    """

    def get_secret(self, name: str) -> str:
        value = os.getenv(name)
        if value is None:
            raise SecretNotFoundError(f"Secret '{name}' not found in environment")
        return value


class SecretManager:
    """Secret manager that delegates to a configured provider.

    The environment variable POKEDEX_SECRET_PROVIDER controls which
    provider strategy is used. Currently only the 'env' provider is
    implemented; other providers should be implemented as classes that
    inherit SecretProvider and registered here.
    """

    _PROVIDER_ENV = "env"
    _provider_instance: Optional[SecretProvider] = None

    @classmethod
    def _select_provider(cls) -> SecretProvider:
        if cls._provider_instance is not None:
            return cls._provider_instance

        provider_name = os.getenv("POKEDEX_SECRET_PROVIDER", cls._PROVIDER_ENV)
        if provider_name == cls._PROVIDER_ENV:
            cls._provider_instance = EnvSecretProvider()
            return cls._provider_instance

        # For any non-supported providers, be explicit about missing
        # integration so callers can detect misconfiguration early.
        raise NotImplementedError(
            "Secret provider integration not configured for '%s'.\n"
            "Implement and register a SecretProvider for this name." % provider_name
        )

    @classmethod
    def get_secret(cls, name: str) -> str:
        """Retrieve a secret by name using the configured provider.

        Errors:
        - SecretNotFoundError when the named secret is missing from the
          provider (wrapped to a domain-specific exception type).
        - NotImplementedError when a provider is expected but no
          implementation exists for the configured provider name.

        This method intentionally does not read environment variables
        directly at call sites to centralize provider selection and to
        make future rotation / auditability integrations straightforward.
        """
        provider = cls._select_provider()
        return provider.get_secret(name)

    @classmethod
    def register_provider(cls, provider: SecretProvider) -> None:
        """Register a concrete provider instance (useful for tests or to
        register a production provider implementation at startup).
        """
        cls._provider_instance = provider
