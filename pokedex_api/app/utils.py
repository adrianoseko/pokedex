import httpx

BASE_URL = "https://pokeapi.co/api/v2/pokemon"

async def fetch_pokemon_data(limit: int, offset: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL, params={"limit": limit, "offset": offset})
        response.raise_for_status()
        data = response.json()
        return data['results']

async def fetch_pokemon_details(id: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/{id}")
        response.raise_for_status()
        return response.json()
