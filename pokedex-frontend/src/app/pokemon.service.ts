import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private pokemonsUrl = 'http://localhost:8000/pokemons';
  private pokemonUrl = 'http://localhost:8000/pokemon';
  private pokedexUrl = 'http://localhost:8000/pokedex'

  constructor(private http: HttpClient) { }



  getPokedex(): Observable<any> {
    return this.http.get<any[]>(this.pokedexUrl);
  }

  getPokemons(): Observable<any> {
    return this.http.get<any[]>(this.pokemonsUrl);
  }

  getPokemon(id: number): Observable<any> {
    return this.http.get<any>(`${this.pokemonUrl}/${id}`);
  }

  postPokemon(data: any): Observable<any> {
    return this.http.post<any>('http://localhost:8000/addPokemon/', data);
  }
}
