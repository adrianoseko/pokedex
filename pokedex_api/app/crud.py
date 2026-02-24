from typing import List, Optional
from sqlalchemy.orm import Session
from app import models

"""CRUD helpers for Pokemon data access.

This module exposes small, focused functions for reading Pokemon
records from the database. Functions intentionally remain thin
wrappers around SQLAlchemy queries to preserve existing behaviour.
"""

DEFAULT_SKIP: int = 0
DEFAULT_LIMIT: int = 100

__all__ = ["get_pokemons", "get_pokemon"]


def get_pokemons(db: Session, skip: int = DEFAULT_SKIP, limit: int = DEFAULT_LIMIT) -> List[models.Pokemon]:
    """Return a list of Pokemon records.

    Parameters:
    - db: SQLAlchemy Session used for the query.
    - skip: number of records to skip (offset).
    - limit: maximum number of records to return.

    Returns:
    - List of models.Pokemon instances.
    """
    return db.query(models.Pokemon).offset(skip).limit(limit).all()


def get_pokemon(db: Session, pokemon_id: int) -> Optional[models.Pokemon]:
    """Return a single Pokemon by its ID, or None if not found.

    Parameters:
    - db: SQLAlchemy Session used for the query.
    - pokemon_id: integer primary key of the desired Pokemon.

    Returns:
    - A models.Pokemon instance or None.
    """
    return db.query(models.Pokemon).filter(models.Pokemon.id == pokemon_id).first()
