import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  // Base URL centralized to make future changes easier
  private readonly baseUrl: string = 'http://localhost:8000';

  // Endpoint paths
  private readonly pokemonsPath = '/pokemons';
  private readonly pokemonPath = '/pokemon';
  private readonly pokedexPath = '/pokedex';
  private readonly addPokemonPath = '/addPokemon/';

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch the pokedex list
   */
  getPokedex(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}${this.pokedexPath}`)
      .pipe(catchError((err) => this.handleError(err)));
  }

  /**
   * Fetch all pokemons
   */
  getPokemons(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.baseUrl}${this.pokemonsPath}`)
      .pipe(catchError((err) => this.handleError(err)));
  }

  /**
   * Fetch a single pokemon by id
   */
  getPokemon(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}${this.pokemonPath}/${id}`)
      .pipe(catchError((err) => this.handleError(err)));
  }

  /**
   * Add a new pokemon
   */
  postPokemon(data: any): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}${this.addPokemonPath}`, data)
      .pipe(catchError((err) => this.handleError(err)));
  }

  /**
   * Centralized error handler that logs and re-throws the error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    // Keep behavior compatible with the original implementation by rethrowing the same error
    // while providing a centralized place for logging or future customization.
    // eslint-disable-next-line no-console
    console.error('PokemonService error:', error);
    return throwError(() => error);
  }
}
