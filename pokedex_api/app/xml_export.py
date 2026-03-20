from typing import Iterable, Mapping, List, Dict, Any

KEY_POKEMONS = 'pokemons'
KEY_NAME = 'name'
KEY_URL = 'url'


def _to_pokemon_entry(pokemon: Mapping[str, Any]) -> Dict[str, Any]:
    '''
    Extracts 'name' and 'url' from a pokemon mapping.
    Accesses keys directly to preserve original KeyError/TypeError behavior.
    '''
    return {KEY_NAME: pokemon[KEY_NAME], KEY_URL: pokemon[KEY_URL]}


def export_to_xml(pokemon_list: Iterable[Mapping[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    '''
    Export Pokémon data to a simple XML-like dict structure.

    The returned structure matches the original implementation:
    {'pokemons': [{'name': ..., 'url': ...}, ...]}

    This function preserves original behavior: it expects each item in
    pokemon_list to be a mapping supporting indexing by 'name' and 'url'.
    '''
    return {KEY_POKEMONS: [_to_pokemon_entry(p) for p in pokemon_list]}


__all__ = ['export_to_xml']