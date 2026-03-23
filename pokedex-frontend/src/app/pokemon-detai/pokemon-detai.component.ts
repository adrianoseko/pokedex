import { Component, OnInit, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { PokemonService } from '../pokemon.service';
import { environment } from '../../environments/environment';

interface PokemonApi {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites?: { front_default?: string };
  base_experience?: number;
  types?: any[];
  [key: string]: any;
}

interface PokePayload {
  id: number;
  name: string;
  height: number;
  weight: number;
  image?: string;
  url: string;
  base_experience?: number;
  type: string;
  _meta?: { authToken?: string };
}

/**
 * Simple secure storage helper and token rotator.
 * ProvidedIn root so it can be reused by other parts of the app (e.g. interceptors).
 * Uses environment.secretRotationUrl if configured to fetch rotated secrets.
 */
@Injectable({ providedIn: 'root' })
class SecureStorageService {
  private readonly storageKey = 'auth_token';

  constructor(private http: HttpClient) {}

  getToken(): string | null {
    try {
      return sessionStorage.getItem(this.storageKey);
    } catch {
      // In some environments (e.g. server-side rendering) sessionStorage may be unavailable.
      return null;
    }
  }

  setToken(token: string): void {
    try {
      sessionStorage.setItem(this.storageKey, token);
    } catch {
      // noop - best effort
    }
  }

  /**
   * Try to obtain a rotated secret/token from a configured remote endpoint.
   * Returns an observable with the token string or null on failure.
   */
  rotateToken(): Observable<string | null> {
    const url = environment.secretRotationUrl;
    if (!url) {
      return of(null);
    }

    return this.http.get<{ token?: string }>(url).pipe(
      map(resp => (resp && resp.token) ? resp.token : null),
      tap(token => { if (token) { this.setToken(token); } }),
      catchError(() => of(null))
    );
  }
}

@Component({
  selector: 'app-pokemon-detai',
  templateUrl: './pokemon-detai.component.html',
  styleUrls: ['./pokemon-detai.component.scss']
})
export class PokemonDetailComponent implements OnInit {
  pokemon: PokemonApi | null = null;

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService,
    private http: HttpClient,
    private secureStorage: SecureStorageService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
      console.error('Invalid or missing Pokemon id in route:', idParam);
      return;
    }

    this.pokemonService.getPokemon(id).pipe(
      catchError(err => {
        console.error('Failed to load Pokemon', err);
        return of(null);
      })
    ).subscribe(data => {
      this.pokemon = data;
    });
  }

  /**
   * Add currently loaded Pokemon to the Pokédex.
   * Enforces optional origin restrictions and optional auth requirements driven by environment variables.
   */
  addInPokeDex(): void {
    // 1) origin restriction: if allowedOrigins is configured, require current origin to be present
    if (!this.isOriginAllowed()) {
      console.error('Write operations are restricted from this origin:', window.location.origin);
      return;
    }

    if (!this.pokemon) {
      console.error('No Pokemon is loaded to add to the Pokédex.');
      return;
    }

    // 2) auth: if the environment requires auth for writes, ensure we have a token (try rotation if needed)
    this.ensureAuthIfRequired().then(canProceed => {
      if (!canProceed) {
        console.error('Write operation not authorized.');
        return;
      }

      const payload: PokePayload = {
        id: this.pokemon.id,
        name: this.pokemon.name,
        height: this.pokemon.height,
        weight: this.pokemon.weight,
        image: this.pokemon.sprites?.front_default || '',
        url: '',
        base_experience: this.pokemon.base_experience || 0,
        type: this.formatTypes(this.pokemon.types)
      };

      // Attach metadata with token for downstream consumers (interceptors/backends) if present.
      const token = this.secureStorage.getToken();
      if (token) {
        (payload as any)._meta = { authToken: token };
      }

      this.pokemonService.postPokemon(payload).pipe(
        catchError(err => {
          console.error('Failed to post Pokemon to Pokédex', err);
          return of(null);
        })
      ).subscribe(result => {
        // preserve existing behavior of logging the response
        console.log(result);
      });
    }).catch(err => {
      console.error('Unexpected error during authorization check', err);
    });
  }

  private isOriginAllowed(): boolean {
    const allowed = environment.allowedOrigins;
    // If no allowedOrigins are configured, default to existing behavior (allow)
    if (!allowed || !Array.isArray(allowed) || allowed.length === 0) {
      return true;
    }
    return allowed.includes(window.location.origin);
  }

  private ensureAuthIfRequired(): Promise<boolean> {
    // If auth requirement is not enabled via environment, preserve original behavior and proceed.
    if (!environment.requireAuthForWrites) {
      return Promise.resolve(true);
    }

    const token = this.secureStorage.getToken();
    if (token) {
      return Promise.resolve(true);
    }

    // Try to rotate/fetch a token from secure storage endpoint, if configured
    return this.secureStorage.rotateToken().toPromise().then(rotated => {
      if (rotated) {
        return true;
      }
      // no token after rotation attempt
      return false;
    }).catch(err => {
      console.error('Error while attempting to rotate secret/token', err);
      return false;
    });
  }

  private formatTypes(types: any[] | undefined): string {
    if (!types || !Array.isArray(types) || types.length === 0) {
      return '';
    }
    try {
      return types.map(t => (t && t.type && t.type.name) ? t.type.name : String(t)).join(',');
    } catch {
      return '';
    }
  }
}
