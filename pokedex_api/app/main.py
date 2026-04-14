import os
import json
import logging
import hashlib
import threading
from typing import List, Generator, Optional

from fastapi import FastAPI, HTTPException, Depends, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import xmltodict

from utils import fetch_pokemon_data, fetch_pokemon_details
from xml_export import export_to_xml
from models import PokemonApi, PokemonModel, Pokemon
from database import SessionLocal  # assuming SessionLocal is defined in database.py

# Module logger (do NOT configure global logging here; application entrypoint should configure handlers)
logger = logging.getLogger("pokedex_api.app")

# Security bearer scheme for write operations
bearer_scheme = HTTPBearer(auto_error=False)


class SecretStore:
    """
    Secret loader supporting environment-provided tokens and an optional
    file-backed rotation list. This implementation adds caching of the
    rotation file to avoid repeated I/O and allows optional precedence
    behavior via environment configuration.

    Behavior (configurable via env vars):
    - WRITE_TOKENS: comma-separated tokens from environment (default behavior preserved)
    - SECRET_STORE_PATH: optional path to JSON file containing write tokens
      in key `write_tokens` or `tokens`.
    - SECRET_STORE_REPLACE_ENV: if set to "1" or "true" (case-insensitive),
      then file tokens will replace environment tokens. Otherwise, tokens are merged
      with env tokens kept first (preserves legacy behavior).

    The rotation file is cached and only reloaded when its modification time (mtime)
    changes.
    """

    ENV_VAR = "WRITE_TOKENS"
    ROTATION_PATH_ENV = "SECRET_STORE_PATH"
    REPLACE_ENV_VAR = "SECRET_STORE_REPLACE_ENV"

    def __init__(self) -> None:
        self._env_tokens = self._load_from_env()
        self._rotation_path = os.getenv(self.ROTATION_PATH_ENV)
        self._replace_env = os.getenv(self.REPLACE_ENV_VAR, "").lower() in ("1", "true", "yes")

        # Cache for file-based tokens
        self._file_tokens: List[str] = []
        self._file_mtime: Optional[float] = None
        self._cache_lock = threading.Lock()

    def _load_from_env(self) -> List[str]:
        raw = os.getenv(self.ENV_VAR, "")
        tokens = [t.strip() for t in raw.split(",") if t.strip()]
        return tokens

    def _read_file_tokens(self) -> List[str]:
        if not self._rotation_path:
            return []

        try:
            stat = os.stat(self._rotation_path)
            mtime = stat.st_mtime
        except FileNotFoundError:
            logger.debug("Secret rotation file not found at %s", self._rotation_path)
            return []
        except Exception:
            logger.exception("Unable to stat secret rotation file: %s", self._rotation_path)
            return []

        # If cached and mtime unchanged, return cached
        with self._cache_lock:
            if self._file_mtime == mtime and self._file_tokens:
                return list(self._file_tokens)

            # Otherwise, reload
            try:
                with open(self._rotation_path, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                tokens = data.get("write_tokens") or data.get("tokens") or []
                if isinstance(tokens, list):
                    sanitized = [t for t in tokens if isinstance(t, str) and t]
                else:
                    sanitized = []

                # update cache
                self._file_tokens = sanitized
                self._file_mtime = mtime
                return list(self._file_tokens)
            except json.JSONDecodeError:
                logger.exception("Rotation file contains invalid JSON: %s", self._rotation_path)
                return []
            except FileNotFoundError:
                # Race: file removed after stat
                logger.debug("Rotation file disappeared while reading: %s", self._rotation_path)
                self._file_tokens = []
                self._file_mtime = None
                return []
            except Exception:
                logger.exception("Failed to load rotated secrets from file: %s", self._rotation_path)
                return []

    def get_write_tokens(self) -> List[str]:
        """Return the effective list of write tokens according to precedence rules.

        Default behavior preserves legacy merging (env tokens followed by file tokens).
        If SECRET_STORE_REPLACE_ENV is enabled, file tokens take precedence and env tokens
        are ignored when file tokens exist.
        """
        file_tokens = self._read_file_tokens()
        if self._replace_env:
            if file_tokens:
                return list(dict.fromkeys(file_tokens))
            return list(dict.fromkeys(self._env_tokens))

        # Legacy behavior: env tokens are kept and file tokens appended (deduplicated)
        merged = list(dict.fromkeys(self._env_tokens + file_tokens))
        return merged


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


# Centralized exception handler to avoid leaking internal error strings to clients
@app.exception_handler(Exception)
async def internal_exception_handler(request, exc: Exception):
    logger.exception("Unhandled exception while processing request %s %s", getattr(request, "method", "?"), getattr(request, "url", "?"))
    # Return a generic error message to the client
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _mask_token_for_logging(token: str) -> str:
    """Return a non-sensitive identifier for a token (SHA256 hash).

    Logging the raw token is a security risk; instead we log a stable hash.
    """
    try:
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return digest
    except Exception:
        # Fallback to short prefix (should not happen)
        return (token[:8] + "...") if token else "<empty>"


def authorize_write(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> None:
    """
    Authorize write operations based on Bearer token.

    Raises HTTPException(401/403) when missing/invalid token.
    """
    if credentials is None or not credentials.credentials:
        logger.warning("Missing authorization credentials for write operation")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token")

    token = credentials.credentials
    valid_tokens = secret_store.get_write_tokens()
    if token not in valid_tokens:
        masked = _mask_token_for_logging(token)
        logger.warning("Unauthorized write attempt, token_hash=%s", masked)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or unauthorized token")


# Repository pattern for DB operations
class PokemonRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, pokemon_model: PokemonModel) -> Pokemon:
        """Create a Pokemon record in the DB. The primary key is generated by the DB.

        We intentionally ignore any client-supplied id to avoid collisions or privilege issues.
        """
        db_pokemon = Pokemon(
            name=pokemon_model.name,
            height=pokemon_model.height,
            weight=pokemon_model.weight,
            url=pokemon_model.url,
            image=pokemon_model.image,
            base_experience=pokemon_model.base_experience,
            type=pokemon_model.type,
        )
        self._session.add(db_pokemon)
        # Commit should be done by caller in a transaction; keeping behavior similar to original
        self._session.commit()
        self._session.refresh(db_pokemon)
        return db_pokemon

    def list_all(self) -> List[Pokemon]:
        return self._session.query(Pokemon).all()


# Helper to fetch and sort pokemons to avoid duplication
async def fetch_and_sorted_pokemons(limit: int = 100, offset: int = 0) -> List[dict]:
    pokemons = await fetch_pokemon_data(limit, offset)
    if isinstance(pokemons, list):
        pokemons.sort(key=lambda x: x.get("name", ""))
    return pokemons


# Read endpoints (simplified error handling — rely on centralized handler)
@app.get("/pokemons", response_model=List[PokemonApi])
async def list_pokemons(limit: int = 100, offset: int = 0):
    """Fetch a list of pokemons from upstream and return them sorted by name."""
    pokemon_list = await fetch_and_sorted_pokemons(limit, offset)
    return pokemon_list


@app.get("/pokemons/{pokemon_id}")
async def get_pokemon_details_endpoint(pokemon_id: int):
    """Fetch details about a single pokemon from upstream."""
    details = await fetch_pokemon_details(pokemon_id)
    return details


@app.get("/pokemons/export/xml")
async def export_pokemons_to_xml(limit: int = 100, offset: int = 0):
    """Export a list of pokemons as XML. Returns Content-Type: application/xml."""
    pokemon_list = await fetch_and_sorted_pokemons(limit, offset)
    xml_data = export_to_xml(pokemon_list)
    # xmltodict.unparse returns a string representation of XML
    xml_string = xmltodict.unparse(xml_data, pretty=True)
    return Response(content=xml_string, media_type="application/xml")


# Write endpoint protected by authorization (RESTful path)
@app.post("/pokemons", response_model=PokemonModel)
async def create_pokemon(pokemon: PokemonModel, db: Session = Depends(get_db), _auth: None = Depends(authorize_write)):
    """Create a new Pokemon record in the database. Protected by bearer token authorization.

    Note: any client-supplied `id` is ignored and the database will generate the primary key.
    """
    repo = PokemonRepository(db)
    try:
        created = repo.add(pokemon)
        return created
    except IntegrityError:
        logger.exception("Database integrity error creating pokemon: %s", getattr(pokemon, "name", None))
        # Do not leak DB details to client
        raise HTTPException(status_code=400, detail="Failed to create resource due to integrity constraints")


@app.get("/pokedex", response_model=List[PokemonModel])
async def list_pokedex(db: Session = Depends(get_db)):
    """List pokedex entries stored in the application's database."""
    repo = PokemonRepository(db)
    return repo.list_all()
