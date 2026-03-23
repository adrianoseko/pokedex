import os
import json
import logging
from typing import Any, Dict, Iterable, List, Mapping
from functools import wraps

logger = logging.getLogger(__name__)

# Default allowed origins (known frontends). Can be overridden by environment.
_DEFAULT_ALLOWED_ORIGINS = [
    "https://app.pokedex.example",
    "https://admin.pokedex.example",
]

# Environment variable names used for configuration/secure storage.
_ALLOWED_ORIGINS_ENV = "POKEDEX_ALLOWED_ORIGINS"
_SECRETS_ENV = "POKEDEX_SECRETS"


def get_allowed_origins() -> List[str]:
    """
    Return the list of allowed origins used by frontends.

    The list is environment-driven via POKEDEX_ALLOWED_ORIGINS (comma-separated).
    Falls back to a safe default list of known frontends.
    """
    raw = os.getenv(_ALLOWED_ORIGINS_ENV, "").strip()
    if not raw:
        logger.debug("No allowed origins set in environment; using defaults")
        return list(_DEFAULT_ALLOWED_ORIGINS)

    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    logger.debug("Loaded allowed origins from environment: %s", origins)
    return origins if origins else list(_DEFAULT_ALLOWED_ORIGINS)


def fetch_rotating_secrets() -> List[str]:
    """
    Fetch rotating secrets from secure storage; abstracted to read from environment.

    In a production deployment this should be replaced with a secure secrets
    manager (e.g., Vault, AWS Secrets Manager). The environment variable
    POKEDEX_SECRETS may contain either a JSON array of tokens or a
    comma-separated list.
    """
    raw = os.getenv(_SECRETS_ENV, "").strip()
    if not raw:
        logger.debug("No secrets found in environment")
        return []

    # Try JSON array first for safer formatting
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            secrets = [str(s) for s in parsed if s]
            logger.debug("Loaded %d secrets from JSON environment variable", len(secrets))
            return secrets
    except json.JSONDecodeError:
        logger.debug("POKEDEX_SECRETS not valid JSON, falling back to CSV parse")

    # Fallback: comma separated
    secrets = [s.strip() for s in raw.split(",") if s.strip()]
    logger.debug("Loaded %d secrets from CSV environment variable", len(secrets))
    return secrets


def is_valid_write_token(token: str) -> bool:
    """
    Validate a write token against the currently available rotating secrets.

    This is a simple check designed to be used by write endpoints to enforce
    authorization. It uses environment-driven secrets and supports rotation by
    updating the POKEDEX_SECRETS environment variable.
    """
    if not token:
        logger.debug("Empty token provided to is_valid_write_token")
        return False

    secrets = fetch_rotating_secrets()
    valid = token in secrets
    logger.debug("Token validation result: %s", valid)
    return valid


def require_write_auth(token_arg_name: str = "auth_token"):
    """
    Decorator factory to enforce write authorization on endpoint-like callables.

    The wrapped function is expected to be called with a keyword argument that
    supplies the token (default key: 'auth_token'). The decorator will call
    is_valid_write_token() and raise a PermissionError on failure.

    Note: This utility is provided here for convenience. It does not change the
    behavior of export_to_xml(), which remains a pure serializer.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            token = kwargs.get(token_arg_name) or kwargs.get("token")
            if not is_valid_write_token(token):
                logger.warning("Unauthorized write access attempt")
                raise PermissionError("Unauthorized: invalid write token")
            return func(*args, **kwargs)

        return wrapper

    return decorator


def _serialize_pokemon_entry(entry: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Serialize a single Pokémon mapping into the expected dictionary shape.

    This intentionally accesses 'name' and 'url' using indexing to preserve the
    original behavior (KeyError will be raised if keys are missing).
    """
    return {"name": entry["name"], "url": entry["url"]}


def export_to_xml(pokemon_list: Iterable[Mapping[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Export Pokémon data to a simple XML-like Python structure.

    Preserves original behavior: given an iterable of mappings that contain
    'name' and 'url' keys, returns a dict with a single key 'pokemons' whose
    value is a list of dictionaries each with 'name' and 'url'.

    Example input:
        [{"name": "Pikachu", "url": "..."}, ...]

    Example output:
        {"pokemons": [{"name": "Pikachu", "url": "..."}, ...]}

    Type hints are provided for clarity but the runtime behavior is unchanged.
    """
    # Build the list using a comprehension to keep code concise and readable.
    # Access semantics are identical to the original implementation.
    pokemons = [_serialize_pokemon_entry(pokemon) for pokemon in pokemon_list]
    return {"pokemons": pokemons}
