from pydantic import BaseModel
from sqlalchemy import Column, Integer, String
from database import Base
from pydantic import BaseModel


class Pokemon(Base):
    __tablename__ = "pokemons"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    height = Column(Integer)
    weight = Column(Integer)
    url = Column(String)
    image = Column(String)
    base_experience = Column(Integer)
    type = Column(String)

class PokemonModel(BaseModel):
    id: int
    name: str
    height: int
    weight: int
    url: str
    image: str
    base_experience: int
    type: str

class PokemonApi(BaseModel):
    name: str
    url: str

