from typing import List, Optional
from sqlalchemy.orm import Session
from app import models

"""CRUD helpers for Pokemon data access.

This module exposes small, focused functions for reading Pokemon
records from the database. Functions intentionally remain thin
wrappers around SQLAlchemy queries to preserve existing behaviour.

Refactor notes:
- Introduced a small internal helper to centralize creation of the
  base query for the Pokemon model (DRY).
- Added a type alias for a list of Pokemon to improve readability.
"""

DEFAULT_SKIP: int = 0
DEFAULT_LIMIT: int = 100

PokemonList = List[models.Pokemon]

__all__ = ["get_pokemons", "get_pokemon"]


def _base_pokemon_query(db: Session):
    """Return a SQLAlchemy query for the Pokemon model.

    This internal helper centralizes creation of the base query
    so higher-level functions remain concise and consistent.
    """
    return db.query(models.Pokemon)


def get_pokemons(db: Session, skip: int = DEFAULT_SKIP, limit: int = DEFAULT_LIMIT) -> PokemonList:
    """Return a list of Pokemon records.

    Parameters:
    - db: SQLAlchemy Session used for the query.
    - skip: number of records to skip (offset).
    - limit: maximum number of records to return.

    Returns:
    - List of models.Pokemon instances.
    """
    query = _base_pokemon_query(db).offset(skip).limit(limit)
    return query.all()


def get_pokemon(db: Session, pokemon_id: int) -> Optional[models.Pokemon]:
    """Return a single Pokemon by its ID, or None if not found.

    Parameters:
    - db: SQLAlchemy Session used for the query.
    - pokemon_id: integer primary key of the desired Pokemon.

    Returns:
    - A models.Pokemon instance or None.
    """
    return _base_pokemon_query(db).filter(models.Pokemon.id == pokemon_id).first()
