from typing import Any, Generator, List
import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import xmltodict

from database import SessionLocal  # assuming SessionLocal is defined in database.py
from models import Pokemon, PokemonApi, PokemonModel
from utils import fetch_pokemon_data, fetch_pokemon_details
from xml_export import export_to_xml

# Configure logging
logger = logging.getLogger("pokedex_api")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="PokeAPI Integration",
    description="API to fetch and display Pokemon data",
    version="1.0.0",
)

# CORS configuration
CORS_SETTINGS = {
    "allow_origins": ["*"],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE"],
    "allow_headers": ["*"],
}

app.add_middleware(CORSMiddleware, **CORS_SETTINGS)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and ensure it is closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _sort_pokemon_by_name(pokemon_list: List[dict]) -> None:
    """Sort an in-place list of pokemon dictionaries by the 'name' key."""
    try:
        pokemon_list.sort(key=lambda x: x["name"])  # Sort alphabetically
    except Exception:
        # If sorting fails for unexpected data, log and continue without raising
        logger.exception("Failed to sort pokemon list by name.")


@app.get("/pokemons", response_model=List[PokemonApi])
async def list_pokemons(limit: int = 100, offset: int = 0) -> List[PokemonApi]:
    """Fetch a list of Pokémon from the external source, sorted by name."""
    try:
        pokemon_list = await fetch_pokemon_data(limit, offset)
        _sort_pokemon_by_name(pokemon_list)
        return pokemon_list
    except Exception as exc:  # Preserve original behavior but log details
        logger.exception("Error fetching pokemon list: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/pokemon/{id}")
async def get_pokemon_details(id: int) -> Any:
    """Fetch detailed information for a single Pokémon by ID."""
    try:
        details = await fetch_pokemon_details(id)
        return details
    except Exception as exc:
        logger.exception("Error fetching pokemon details for id=%s: %s", id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/pokemon/export/xml")
async def export_pokemons_to_xml(limit: int = 100, offset: int = 0) -> str:
    """Export a set of Pokémon to XML format (string)."""
    try:
        pokemon_list = await fetch_pokemon_data(limit, offset)
        _sort_pokemon_by_name(pokemon_list)
        xml_data = export_to_xml(pokemon_list)
        return xmltodict.unparse(xml_data, pretty=True)
    except Exception as exc:
        logger.exception("Error exporting pokemon list to XML: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/addPokemon/", response_model=PokemonModel)
async def add_pokemon(pokemon: PokemonModel, db: Session = Depends(get_db)) -> PokemonModel:
    """Add a Pokémon record to the local database and return the created record."""
    try:
        # Use the pydantic model dict to construct the SQLAlchemy model to reduce manual mapping
        payload = pokemon.dict()
        db_pokemon = Pokemon(**payload)
        db.add(db_pokemon)
        db.commit()
        db.refresh(db_pokemon)
        return db_pokemon
    except Exception as exc:
        logger.exception("Error adding pokemon to database: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/pokedex", response_model=List[PokemonModel])
async def get_pokedex(db: Session = Depends(get_db)) -> List[PokemonModel]:
    """Return all Pokémon stored in the local database."""
    try:
        pokemon_list = db.query(Pokemon).all()
        return pokemon_list
    except Exception as exc:
        logger.exception("Error querying pokedex from database: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
