import warnings
from typing import Any, Dict, Optional, Tuple, Type

from pydantic import BaseModel, HttpUrl, create_model, Field
from sqlalchemy import Column, Integer, String, Index
from sqlalchemy.orm import declarative_base

# Try to import project-wide Base to avoid creating a second declarative base
# which could lead to mismatches. If the application's `database` module is
# not importable at module-initialization time (circular import risk), fall
# back to a local declarative_base but emit a clear warning so the runtime
# environment can be diagnosed. This preserves compatibility while reducing
# circular import risk (see code-smell remediation notes).
try:
    # Importing here as a best-effort to reuse the application Base
    # without creating an import-time circular dependency. If the package's
    # `database` module imports models, that module should be adjusted so it
    # only exposes Base (no model imports) — this code will warn instead of
    # failing in such scenarios.
    from database import Base  # type: ignore
except Exception:
    Base = declarative_base()
    warnings.warn(
        "Could not import application Base from 'database'. Falling back to a local declarative_base()."
        " Ensure 'database' exposes Base without importing models to avoid circular imports.",
        RuntimeWarning,
    )


# SQLAlchemy model (single source of truth for persistence)
class Pokemon(Base):
    """SQLAlchemy ORM model for a Pokemon.

    Design notes:
    - The actual database column name for the Pokemon's type is preserved as
      'type' to maintain backward compatibility with the existing schema.
    - The Python attribute is named `pokemon_type` and is mapped to the
      existing column name to avoid shadowing the built-in `type()`.
    - A read/write `type` property is retained as a compatibility shim that
      forwards to `pokemon_type` and emits a deprecation warning so callers
      can migrate away from the ambiguous attribute name.
    - String lengths are explicit to produce consistent SQL types across backends.
    - Nullable is explicit (kept consistent with previous behavior: columns
      were previously nullable by default, so we keep nullable=True).
    """

    __tablename__ = "pokemons"

    id = Column(Integer, primary_key=True)

    # Keep explicit String length for schema clarity; keep nullable=True to
    # preserve previous behavior (no schema-level required constraint).
    name = Column(String(255), nullable=True, index=True)
    height = Column(Integer, nullable=True)
    weight = Column(Integer, nullable=True)

    # URLs may be long; choose a conservative maximum length consistent with
    # common URL length recommendations.
    url = Column(String(2083), nullable=True)
    image = Column(String(2083), nullable=True)

    base_experience = Column(Integer, nullable=True)

    # Preserve DB column name 'type' but avoid using attribute name `type`.
    # This maps the attribute pokemon_type to the DB column named 'type'.
    pokemon_type = Column("type", String(100), nullable=True)

    # Optional index for queries that may filter by type in the future.
    __table_args__ = (
        Index("ix_pokemons_pokemon_type", "type"),
    )

    def __repr__(self) -> str:  # pragma: no cover - trivial representation
        return (
            f"<Pokemon(id={self.id!r}, name={self.name!r}, "
            f"pokemon_type={self.pokemon_type!r})>"
        )

    # Backwards-compatibility property: accessor named `type` returns
    # `pokemon_type`. This preserves behavior for downstream code that
    # still expects a .type attribute while signaling deprecation.
    @property
    def type(self) -> Optional[str]:
        warnings.warn(
            "Pokemon.type is deprecated; use Pokemon.pokemon_type instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.pokemon_type

    @type.setter
    def type(self, value: Optional[str]) -> None:
        warnings.warn(
            "Pokemon.type is deprecated; use Pokemon.pokemon_type instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        self.pokemon_type = value


# -----------------------------
# Pydantic model generation
# -----------------------------
# To avoid duplicating field definitions and to keep a single source of
# truth we dynamically generate Pydantic schemas from the SQLAlchemy model
# metadata. This reduces schema drift while still creating lightweight
# validation models for application use.

# Mapping from common SQLAlchemy column types to Python/Pydantic types.
_SA_TO_PYDANTIC: Dict[Type[Any], Type[Any]] = {
    Integer: int,
    String: str,
}


def _python_type_for_column(col: Column) -> Type[Any]:
    """Infer a conservative Python type for a given SQLAlchemy Column.

    Only a limited mapping is required for this model file; unknown types
    fall back to `Any` to preserve behavior.
    """
    sa_type = type(col.type)
    return _SA_TO_PYDANTIC.get(sa_type, Any)


def _build_pydantic_model_from_sqla(
    sqla_model: Type[Base],
    model_name: str,
    include_columns: Optional[Tuple[str, ...]] = None,
) -> Type[BaseModel]:
    """Create a Pydantic model from an SQLAlchemy model's columns.

    Parameters:
    - sqla_model: The SQLAlchemy declarative model class to inspect.
    - model_name: The desired name for the generated Pydantic model.
    - include_columns: Optional tuple of column names to include. If omitted
      all columns are included.

    The generated model will have orm_mode=True so that .from_orm() works
    with SQLAlchemy instances.
    """
    try:
        fields: Dict[str, Tuple[Type[Any], Any]] = {}

        for col in sqla_model.__table__.columns:  # type: ignore[attr-defined]
            col_name = col.name
            if include_columns is not None and col_name not in include_columns:
                continue

            # Determine pydantic type, with special handling for URLs.
            py_type = _python_type_for_column(col)

            # If the column represents a URL-like field by name, prefer HttpUrl
            # for stronger validation. Keep fallback to str if HttpUrl is not
            # appropriate.
            if col_name in {"url", "image"}:
                annotated_type: Type[Any] = HttpUrl
            else:
                annotated_type = py_type

            # Preserve previous nullability behavior: columns that are nullable
            # are expressed as Optional[...] with a default of None. Primary
            # keys remain required (Ellipsis) to match the original model.
            if col.primary_key:
                fields[col_name] = (annotated_type, ...)
            else:
                fields[col_name] = (Optional[annotated_type], None)

        # Create a Config class enabling orm_mode so that .from_orm() works.
        class Config:  # simple namespace for pydantic configuration
            orm_mode = True

        model = create_model(model_name, __base__=BaseModel, __config__=Config, **fields)
        return model

    except Exception as exc:  # pragma: no cover - safety net
        raise RuntimeError(f"Failed to generate Pydantic model {model_name}: {exc}") from exc


# Full schema derived from the SQLAlchemy model
PokemonModel = _build_pydantic_model_from_sqla(Pokemon, "PokemonModel")

# Lightweight API/summary schema (name + url) used for list endpoints or links.
# The name PokemonSummary is explicit about intent (replaces vague PokemonApi).
PokemonSummary = _build_pydantic_model_from_sqla(Pokemon, "PokemonSummary", include_columns=("name", "url"))


__all__ = [
    "Pokemon",
    "PokemonModel",
    "PokemonSummary",
]
