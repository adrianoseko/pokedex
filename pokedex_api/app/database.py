import os
import logging
from contextlib import contextmanager
from typing import Generator, List, Optional

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

# Keep the original default connection string to preserve behavior when no-env is provided
DEFAULT_SQLALCHEMY_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"


def _fetch_secret_from_secure_store(secret_name: str) -> Optional[str]:
    """
    Attempt to fetch a secret from a secure store.

    NOTE: This is a small abstraction that prefers environment-provided secrets but
    is written so you can replace the implementation with a real secrets manager
    (AWS Secrets Manager, HashiCorp Vault, etc.) without changing callers.

    Current behavior (to preserve existing functionality):
      - If an environment variable named <secret_name> exists, return that.
      - Otherwise, return None so callers fall back to defaults.

    Do NOT modify this behavior in order to preserve backwards compatibility.
    """
    # Prefer explicit environment variable first
    value = os.getenv(secret_name)
    if value:
        return value

    # Secondary environment-based secret naming convention. This allows operators
    # to inject rotated secrets via environment variables like SECRET_SQLALCHEMY_DATABASE_URL.
    rotated_name = f"SECRET_{secret_name}"
    value = os.getenv(rotated_name)
    if value:
        return value

    # Placeholder for integrations with real secret stores. Keep None return to preserve
    # the original fallback behavior (DEFAULT_SQLALCHEMY_DATABASE_URL).
    return None


def get_database_url() -> str:
    """
    Resolve the DB URL by checking multiple sources in priority order:
      1) SQLALCHEMY_DATABASE_URL env var
      2) SECRET_SQLALCHEMY_DATABASE_URL or SQLALCHEMY_DATABASE_URL from secure store
      3) DEFAULT_SQLALCHEMY_DATABASE_URL fallback

    This preserves the original default while enabling operators to inject
    environment-driven or rotated secrets.
    """
    env_value = os.getenv("SQLALCHEMY_DATABASE_URL")
    if env_value:
        return env_value

    secret_value = _fetch_secret_from_secure_store("SQLALCHEMY_DATABASE_URL")
    if secret_value:
        return secret_value

    return DEFAULT_SQLALCHEMY_DATABASE_URL


# Frontend origins allowed to interact with the API. Operators can set the
# environment variable ALLOWED_ORIGINS to a comma-separated list of origins.
# Default is an empty list to avoid implicitly allowing origins unrelated to
# the original application. This does not change DB behavior; it's a utility
# to centralize origin management as requested by the developer instructions.
ALLOWED_ORIGINS: List[str] = []
_allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if _allowed_origins_env:
    ALLOWED_ORIGINS = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]


def is_origin_allowed(origin: Optional[str]) -> bool:
    """Return True if the provided origin is in the configured allow list.

    Keep this function here as a small utility that can be imported by
    middleware or routing code when enforcing CORS for known frontends.
    """
    if not origin:
        return False
    if not ALLOWED_ORIGINS:
        # If no origins configured, be conservative and disallow by default.
        return False
    return origin in ALLOWED_ORIGINS


class Database:
    """Small wrapper around SQLAlchemy engine/session creation.

    Responsibilities:
      - Create SQLAlchemy Engine, Session factory and base declarative class.
      - Provide a simple session factory (get_session) and a context-managed
        session generator (session_scope) to encourage proper cleanup.

    Behavior is kept consistent with the original implementation: if no
    environment-provided URL is available, the default hard-coded URL is used.
    """

    def __init__(self, database_url: str) -> None:
        self.database_url: str = database_url
        self.engine: Optional[Engine] = None
        self.SessionLocal: Optional[sessionmaker] = None
        self.Base = declarative_base()

        self._initialize_engine()

    def _initialize_engine(self) -> None:
        try:
            # Create an engine and session factory; mirror original parameters
            # autocommit=False and autoflush=False so behavior is preserved.
            self.engine = create_engine(self.database_url)
            self.SessionLocal = sessionmaker(
                autocommit=False, autoflush=False, bind=self.engine
            )
        except Exception as exc:  # Keep broad catching to preserve original behavior
            # Log the exception; re-raise so failing imports or application startup
            # surfaces configuration issues immediately.
            logger.exception("Failed to initialize database engine")
            raise

    def get_session(self) -> Session:
        """Return a new Session instance. Matches original behavior.

        Callers that use "with database.get_session() as session:" will continue
        to work because SQLAlchemy sessions support the context manager protocol.
        """
        if self.SessionLocal is None:
            raise RuntimeError("Session factory is not initialized")
        return self.SessionLocal()

    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope around a series of operations.

        This helper is an addition (does not change original behavior) to make
        it easier to use sessions safely. It will rollback on exceptions and
        always close the session.
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# Instantiate a module-level object to preserve the original usage pattern.
_database_url = get_database_url()

database = Database(_database_url)


# Usage example (preserves prior example; prefer session_scope where possible):
#
# with database.get_session() as session:
#     # perform database operations here
#
# or (recommended):
# with database.session_scope() as session:
#     # perform transactional operations here
