from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


"""Database helper module.

Provides a small Database wrapper around SQLAlchemy engine/session creation.
Preserves original behavior while adding validation, type hints, a safe
context manager for sessions, and lifecycle helpers.
"""


class Database:
    """Simple wrapper around SQLAlchemy engine, session factory and base.

    Responsibilities:
    - create the engine from a URL
    - expose a session factory via get_session()
    - provide a session_scope() context manager that ensures sessions are
      properly closed and rolled back on error
    - expose the declarative Base

    Note: Behavior is preserved: get_session() returns a Session instance
    created by a sqlalchemy.orm.sessionmaker configured with autocommit=False
    and autoflush=False.
    """

    def __init__(self, database_url: str, *, echo: bool = False, pool_pre_ping: bool = True) -> None:
        if not isinstance(database_url, str) or not database_url.strip():
            raise ValueError("database_url must be a non-empty string")

        # Keep the same defaults as the original implementation while allowing
        # optional engine flags for debugging / resilience.
        self.engine: Engine = create_engine(database_url, echo=echo, pool_pre_ping=pool_pre_ping)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.Base = declarative_base()

    def get_session(self) -> Session:
        """Return a new SQLAlchemy Session.

        This mirrors the original code which returned a Session instance from
        the configured sessionmaker. The returned Session can be used as a
        context manager itself (SQLAlchemy Session supports the context manager
        protocol) or used directly; callers are responsible for committing if
        needed.
        """
        return self.SessionLocal()

    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Context manager that yields a Session and ensures it is closed.

        On exception, the session will be rolled back and the exception will
        be re-raised. The context manager does not automatically commit; it
        only manages rollback/close to avoid leaking connections.
        """
        session = self.get_session()
        try:
            yield session
        except Exception:
            # Rollback to leave the session in a clean state before closing.
            session.rollback()
            raise
        finally:
            session.close()

    def dispose(self) -> None:
        """Dispose of the underlying engine and its connection pool.

        Useful for clean shutdown in long-running processes or tests.
        """
        self.engine.dispose()

    def __repr__(self) -> str:  # pragma: no cover - trivial
        return f"<Database engine={self.engine.url if hasattr(self.engine, 'url') else self.engine}>"


# Example connection URL for PostgreSQL (preserved from original file)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

# Module level Database instance (preserved behavior)
database = Database(SQLALCHEMY_DATABASE_URL)

# Usage examples (preserved):
# with database.get_session() as session:
#     # perform database operations here
#
# or using the safer context manager defined above:
# with database.session_scope() as session:
#     # perform database operations here
