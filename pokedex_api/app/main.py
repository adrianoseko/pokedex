import os
import json
import logging
from typing import List, Generator, Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import xmltodict

from utils import fetch_pokemon_data, fetch_pokemon_details
from xml_export import export_to_xml
from models import PokemonApi, PokemonModel, Pokemon
from database import SessionLocal  # assuming SessionLocal is defined in database.py

# Configure logging
logger = logging.getLogger("pokedex_api")
logging.basicConfig(level=logging.INFO)

# Security: HTTP Bearer for write operations
bearer_scheme = HTTPBearer(auto_error=False)


class SecretStore:
    """
    Simple secret loader that supports environment-driven secrets and
    optional file-backed rotated secrets. Designed so rotation can be
    achieved by updating the external secure file.

    Implementation notes:
    - Primary source: environment variable WRITE_TOKENS (comma-separated)
    - Optional rotated secrets file: path provided in SECRET_STORE_PATH env var.
      The file should contain JSON with key `write_tokens` as a list of tokens.

    This keeps behavior simple and readable while enabling secret rotation
    via updating the external file (secure storage) without code changes.
    """

    ENV_VAR = "WRITE_TOKENS"
    ROTATION_PATH_ENV = "SECRET_STORE_PATH"

    def __init__(self) -> None:
        self._env_tokens = self._load_from_env()
        self._rotation_path = os.getenv(self.ROTATION_PATH_ENV)

    def _load_from_env(self) -> List[str]:
        raw = os.getenv(self.ENV_VAR, "")
        tokens = [t.strip() for t in raw.split(",") if t.strip()]
        return tokens

    def _load_from_file(self) -> List[str]:
        if not self._rotation_path:
            return []
        try:
            with open(self._rotation_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            tokens = data.get("write_tokens") or data.get("tokens") or []
            if isinstance(tokens, list):
                return [t for t in tokens if isinstance(t, str) and t]
            return []
        except FileNotFoundError:
            logger.warning("Secret rotation file not found at %s", self._rotation_path)
            return []
        except Exception:
            logger.exception("Failed to load rotated secrets from file")
            return []

    def get_write_tokens(self) -> List[str]:
        # Always return a merged list so operators can rotate by updating
        # the rotation file without removing env values.
        file_tokens = self._load_from_file()
        return list(dict.fromkeys(self._env_tokens + file_tokens))


secret_store = SecretStore()


def get_allowed_origins() -> List[str]:
    """
    Read allowed origins from environment variable ALLOWED_ORIGINS.
    Format: comma separated list. Default to a conservative localhost list.
    """
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins


app = FastAPI(title="PokeAPI Integration", description="API to fetch and display Pokemon data", version="1.0.0")

# Configure CORS middleware using environment-driven allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def authorize_write(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> None:
    """
    Authorize write operations based on Bearer token.

    Raises HTTPException(401) when missing/invalid token.
    """
    if credentials is None or not credentials.credentials:
        logger.warning("Missing authorization credentials for write operation")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")

    token = credentials.credentials
    valid_tokens = secret_store.get_write_tokens()
    if token not in valid_tokens:
        logger.warning("Unauthorized write attempt with token: %s", token)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or unauthorized token")


# Read endpoints
@app.get("/pokemons", response_model=List[PokemonApi])
async def list_pokemons(limit: int = 100, offset: int = 0):
    """Fetch a list of pokemons from upstream and return them sorted by name."""
    try:
        pokemon_list = await fetch_pokemon_data(limit, offset)
        pokemon_list.sort(key=lambda x: x.get("name", ""))
        return pokemon_list
    except HTTPException:
        raise
    except Exception as exc:  # preserve behavior but add logging
        logger.exception("Failed to fetch pokemon list")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/pokemon/{id}")
async def get_pokemon_details_endpoint(id: int):
    try:
        details = await fetch_pokemon_details(id)
        return details
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch pokemon details for id=%s", id)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/pokemon/export/xml")
async def export_pokemon_to_xml(limit: int = 100, offset: int = 0):
    try:
        pokemon_list = await fetch_pokemon_data(limit, offset)
        pokemon_list.sort(key=lambda x: x.get("name", ""))
        xml_data = export_to_xml(pokemon_list)
        # xmltodict.unparse returns a string representation of XML
        return xmltodict.unparse(xml_data, pretty=True)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to export pokemon list to XML")
        raise HTTPException(status_code=500, detail=str(exc))


# Write endpoint protected by authorization
@app.post("/addPokemon/", response_model=PokemonModel)
async def create_pokemon(pokemon: PokemonModel, db: Session = Depends(get_db), _auth: None = Depends(authorize_write)):
    """Create a new Pokemon record in the database. Protected by bearer token authorization."""
    try:
        db_pokemon = Pokemon(
            id=pokemon.id,
            name=pokemon.name,
            height=pokemon.height,
            weight=pokemon.weight,
            url=pokemon.url,
            image=pokemon.image,
            base_experience=pokemon.base_experience,
            type=pokemon.type,
        )
        db.add(db_pokemon)
        db.commit()
        db.refresh(db_pokemon)
        return db_pokemon
    except Exception as exc:
        logger.exception("Failed to create pokemon record: %s", getattr(pokemon, "name", None))
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/pokedex", response_model=List[PokemonModel])
async def list_pokedex(db: Session = Depends(get_db)):
    try:
        pokemon_list = db.query(Pokemon).all()
        return pokemon_list
    except Exception as exc:
        logger.exception("Failed to read pokedex from database")
        raise HTTPException(status_code=500, detail=str(exc))
