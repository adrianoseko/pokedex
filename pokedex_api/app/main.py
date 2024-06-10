from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import xmltodict
from utils import fetch_pokemon_data, fetch_pokemon_details
from xml_export import export_to_xml
from models import PokemonApi, PokemonModel, Pokemon

from database import SessionLocal  # assuming SessionLocal is defined in database.py

app = FastAPI(title="PokeAPI Integration", description="API to fetch and display Pokemon data", version="1.0.0")

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow access from any origin (or specify a list of allowed origins)
    allow_credentials=True,  # Allow credentials (e.g., cookies)
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Allow permitted HTTP methods
    allow_headers=["*"],  # Allow all headers in the request
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/pokemons", response_model=List[PokemonApi])
async def get_pokemon(limit: int = 100, offset: int = 0):
    try:
        pokemon_list = await fetch_pokemon_data(limit, offset)
        pokemon_list.sort(key=lambda x: x['name'])  # Sort alphabetically
        return pokemon_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pokemon/{id}")
async def get_pokemon_details(id: int):
    try:
        details = await fetch_pokemon_details(id)
        return details
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pokemon/export/xml")
async def export_pokemon_to_xml(limit: int = 100, offset: int = 0):
    try:
        pokemon_list = await fetch_pokemon_data(limit, offset)
        pokemon_list.sort(key=lambda x: x['name'])  # Sort alphabetically
        xml_data = export_to_xml(pokemon_list)
        return xmltodict.unparse(xml_data, pretty=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/addPokemon/", response_model=PokemonModel)
async def create_pokemon(pokemon: PokemonModel, db: Session = Depends(get_db)):
    try:
        db_pokemon = Pokemon(
            id=pokemon.id,
            name=pokemon.name,
            height=pokemon.height,
            weight=pokemon.weight,
            url=pokemon.url,
            image=pokemon.image,
            base_experience=pokemon.base_experience,
            type=pokemon.type
        )
        db.add(db_pokemon)
        db.commit()
        db.refresh(db_pokemon)
        return db_pokemon
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/pokedex", response_model=List[PokemonModel])
async def get_pokemon(db: Session = Depends(get_db)):
    try:
        pokemon_list = db.query(Pokemon).all()
        return pokemon_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))