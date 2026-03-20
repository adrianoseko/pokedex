import httpx
from typing import Any, Dict, List, Optional

BASE_URL = "https://pokeapi.co/api/v2/pokemon"
_DEFAULT_TIMEOUT = 10.0


async def _fetch_json(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
    """Perform an HTTP GET and return the parsed JSON body.

    This is a small helper to centralize request logic so callers remain
    focused on their specific data extraction.

    Args:
        endpoint: Full URL to request.
        params: Optional query parameters.

    Returns:
        The parsed JSON response (type depends on the endpoint).

    Raises:
        httpx.RequestError or httpx.HTTPStatusError on network/HTTP failure.
    """
    async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as client:
        response = await client.get(endpoint, params=params)
        response.raise_for_status()
        return response.json()


async def fetch_pokemon_data(limit: int, offset: int) -> List[Dict[str, Any]]:
    """Fetch a paginated list of Pokémon.

    Preserves original behavior: returns the list found under the 'results'
    key of the response JSON.

    Args:
        limit: Number of items to request.
        offset: Offset for pagination.

    Returns:
        A list of Pokémon entries (dictionaries) from the API response.
    """
    data = await _fetch_json(BASE_URL, params={"limit": limit, "offset": offset})
    return data["results"]


async def fetch_pokemon_details(id: int) -> Dict[str, Any]:
    """Fetch details for a single Pokémon by numeric id.

    Args:
        id: Pokémon numeric identifier.

    Returns:
        A dictionary containing the Pokémon details as returned by the API.
    """
    return await _fetch_json(f"{BASE_URL}/{id}")
