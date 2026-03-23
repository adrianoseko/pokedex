from typing import List, Optional, Sequence
import os
import logging
from functools import lru_cache
from sqlalchemy.orm import Session
from app import models

"""CRUD helpers for Pokemon data access.

This module exposes small, focused functions for reading Pokemon
records from the database. Functions intentionally remain thin
wrappers around SQLAlchemy queries to preserve existing behaviour.

Developer notes (non-functional helpers included):
- An environment-driven allowed-origin helper is provided so frontends
  can be whitelisted via POKEDEX_ALLOWED_ORIGINS (comma-separated).
- A minimal SecretManager abstraction is included as a placeholder to
  encourage retrieval of rotating secrets from secure storage. The
  concrete integration depends on your secrets backend (Vault, AWS
  Secrets Manager, etc.). These helpers do not change existing CRUD
  behaviour.
"""

DEFAULT_SKIP: int = 0
DEFAULT_LIMIT: int = 100

__all__ = ["get_pokemons", "get_pokemon"]

logger = logging.getLogger(__name__)


class PokemonRepository:
    """Repository encapsulating Pokemon read operations.

    This preserves the original behaviour while improving testability
    and separation of concerns.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    def list(self, skip: int = DEFAULT_SKIP, limit: int = DEFAULT_LIMIT) -> List[models.Pokemon]:
        """Return a list of Pokemon records.

        Behaviour preserved: delegates directly to SQLAlchemy query with
        offset/limit and .all(). No additional filtering or transformation
        is introduced.
        """
        # Keep behavior identical to original implementation
        return self._db.query(models.Pokemon).offset(skip).limit(limit).all()

    def get(self, pokemon_id: int) -> Optional[models.Pokemon]:
        """Return a single Pokemon by its ID, or None if not found.

        Behaviour preserved: uses .filter(...).first() same as original.
        """
        return self._db.query(models.Pokemon).filter(models.Pokemon.id == pokemon_id).first()


def get_pokemons(db: Session, skip: int = DEFAULT_SKIP, limit: int = DEFAULT_LIMIT) -> List[models.Pokemon]:
    """Return a list of Pokemon records.

    Thin wrapper kept for backward compatibility. Delegates to
    PokemonRepository.list to improve testability and adhere to SRP.
    """
    repo = PokemonRepository(db)
    try:
        return repo.list(skip=skip, limit=limit)
    except Exception:  # preserve original behaviour: let calling code see DB errors
        logger.exception("Failed to fetch pokemons (skip=%s, limit=%s)", skip, limit)
        raise


def get_pokemon(db: Session, pokemon_id: int) -> Optional[models.Pokemon]:
    """Return a single Pokemon by its ID, or None if not found.

    Thin wrapper kept for backward compatibility. Delegates to
    PokemonRepository.get to improve testability and adhere to SRP.
    """
    repo = PokemonRepository(db)
    try:
        return repo.get(pokemon_id=pokemon_id)
    except Exception:
        logger.exception("Failed to fetch pokemon with id=%s", pokemon_id)
        raise


# -----------------------------------------------------------------------------
# Environment-driven helpers for CORS and secret retrieval
#
# These helpers are intentionally non-invasive: they do not affect the
# CRUD functions above. They are provided so the codebase can centralize
# origin allowlists and secret retrieval in an environment-driven way,
# supporting rotation and secure storage in the future.
# -----------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_allowed_origins() -> Sequence[str]:
    """Return allowed origins read from POKEDEX_ALLOWED_ORIGINS.

    The environment variable should be a comma-separated list of origins,
    e.g. 'https://app.example.com,https://admin.example.com'. If the
    variable is not set, a sensible default of 'http://localhost:3000' is
    returned to support local development.
    """
    raw = os.getenv("POKEDEX_ALLOWED_ORIGINS", "http://localhost:3000")
    # Split on commas and strip whitespace; preserve order
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    logger.debug("Allowed origins loaded: %s", origins)
    return origins


def is_origin_allowed(origin: str) -> bool:
    """Check whether a given origin is in the allowlist.

    This helper is useful for configuring CORS middleware in a single
    place using environment variables, as requested in developer notes.
    """
    return origin in get_allowed_origins()


class SecretManager:
    """Minimal secret manager abstraction.

    This class is intended to be replaced or extended with a concrete
    implementation that talks to a secret storage provider (e.g. HashiCorp
    Vault, AWS Secrets Manager). For the time being it supports an
    "env"-backed provider for simple setups but raises NotImplementedError
    for other providers to encourage secure integration.

    Usage:
        SecretManager.get_secret("DB_ROTATION_KEY")
    """

    PROVIDER_ENV = "env"

    @staticmethod
    def get_secret(name: str) -> str:
        provider = os.getenv("POKEDEX_SECRET_PROVIDER", SecretManager.PROVIDER_ENV)
        if provider == SecretManager.PROVIDER_ENV:
            # Read secret from environment variable directly. This is useful
            # for simple deployments but we recommend using a proper secret
            # storage for production and rotation.
            value = os.getenv(name)
            if value is None:
                raise KeyError(f"Secret '{name}' not found in environment")
            return value

        # If you need rotation/secure retrieval, implement integration
        # with your secret store here. We intentionally don't ship a
        # provider implementation to avoid coupling this library to any
        # particular vendor.
        raise NotImplementedError(
            "Secret provider integration not configured.\n"
            "Set POKEDEX_SECRET_PROVIDER to 'env' or implement a provider."
        )
