from typing import Any, Dict

from pydantic import BaseModel
from sqlalchemy import Column, Integer, String

from database import Base


class Pokemon(Base):
    """SQLAlchemy model representing a Pokémon stored in the database.

    Keeps the same table name and columns as the original implementation so
    existing behavior is preserved.
    """

    __tablename__ = "pokemons"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    height = Column(Integer)
    weight = Column(Integer)
    url = Column(String)
    image = Column(String)
    base_experience = Column(Integer)
    type = Column(String)

    def __repr__(self) -> str:
        return f"<Pokemon id={self.id} name={self.name!r}>"

    def to_dict(self) -> Dict[str, Any]:
        """Return a plain dict representation of the model instance.

        This helper does not change any stored data or behavior; it simply
        provides a convenient representation for external code or tests.
        """
        return {
            "id": self.id,
            "name": self.name,
            "height": self.height,
            "weight": self.weight,
            "url": self.url,
            "image": self.image,
            "base_experience": self.base_experience,
            "type": self.type,
        }


class PokemonModel(BaseModel):
    """Pydantic model for full Pokemon payloads.

    This model mirrors the SQLAlchemy model fields. orm_mode is enabled to
    allow creating this model from ORM objects (e.g. instances of
    `Pokemon`).
    """

    id: int
    name: str
    height: int
    weight: int
    url: str
    image: str
    base_experience: int
    type: str

    class Config:
        orm_mode = True
        anystr_strip_whitespace = True


class PokemonApi(BaseModel):
    """Pydantic model for API payloads that contain only name and url."""

    name: str
    url: str

    class Config:
        anystr_strip_whitespace = True
