def export_to_xml(pokemon_list):
    """
    Função para exportar dados de Pokémon para XML.
    """
    xml_data = {"pokemons": []}
    for pokemon in pokemon_list:
        xml_data["pokemons"].append({"name": pokemon["name"], "url": pokemon["url"]})
    return xml_data