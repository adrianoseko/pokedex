from pydantic import BaseModel
from sqlalchemy import Column, Integer, String
from database import Base


class Pokemon(Base):
    """SQLAlchemy model for a Pokemon entry.

    NOTE: Attribute names and column names are kept exactly as in the
    original implementation to preserve behavior for the rest of the
    application.
    """

    __tablename__ = "pokemons"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    height = Column(Integer)
    weight = Column(Integer)
    url = Column(String)
    image = Column(String)
    base_experience = Column(Integer)
    # Keep the column name 'type' to preserve existing behavior.
    type = Column(String)

    def __repr__(self) -> str:
        return (
            f"<Pokemon(id={self.id!r}, name={self.name!r}, "
            f"type={self.type!r})>"
        )


class PokemonModel(BaseModel):
    """Pydantic model representing the full Pokemon schema.

    This mirrors the columns on the SQLAlchemy model and is used for
    validation/serialization. orm_mode is enabled to allow .from_orm()
    if needed without changing existing behavior.
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


class PokemonApi(BaseModel):
    """Pydantic model used for lightweight API representations.

    Keeps the same fields as the original implementation.
    """

    name: str
    url: str

    class Config:
        orm_mode = True
