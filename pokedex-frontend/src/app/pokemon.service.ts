import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Pokemon {
  id: number;
  name: string;
  [key: string]: any;
}

export interface PokedexEntry {
  id: number;
  pokemonId: number;
  [key: string]: any;
}

/**
 * Simple secure token manager. This class stores an encrypted token in sessionStorage
 * and provides a rotation mechanism (re-encryption) to reduce the time a single
 * stored ciphertext is used unchanged. In a real application, secrets and rotation
 * should be handled by a secure backend or dedicated secret storage (KMS/Secrets Manager).
 */
class SecureTokenManager {
  private storageKey = 'secure_token_v1';
  private keyStorageKey = 'secure_token_key_v1';

  // Get raw token if available. Returns null when no token present or decryption fails.
  async getToken(): Promise<string | null> {
    try {
      const encryptedB64 = sessionStorage.getItem(this.storageKey);
      if (!encryptedB64) {
        return null;
      }

      const jwk = sessionStorage.getItem(this.keyStorageKey);
      if (!jwk) {
        // Key not available: token cannot be decrypted.
        return null;
      }

      const key = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(jwk),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const encrypted = this.base64ToArrayBuffer(encryptedB64);
      // first 12 bytes are IV
      const iv = encrypted.slice(0, 12);
      const data = encrypted.slice(12);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (err) {
      // If decryption fails, clear storage to avoid repeated failures
      try {
        sessionStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.keyStorageKey);
      } catch (_) {}
      return null;
    }
  }

  // Store token encrypted. Overwrites existing value.
  async setToken(token: string): Promise<void> {
    // Generate a fresh AES-GCM key for encryption
    const cryptoKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt'
    ]);

    const jwk = (await crypto.subtle.exportKey('jwk', cryptoKey)) as JsonWebKey;
    // Save key (JWK) to sessionStorage. In production, do NOT store raw keys in sessionStorage.
    sessionStorage.setItem(this.keyStorageKey, JSON.stringify(jwk));

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(token);

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);

    // Store iv + ciphertext
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    const b64 = this.arrayBufferToBase64(combined.buffer);
    sessionStorage.setItem(this.storageKey, b64);
  }

  // Rotate token by re-encrypting it with a freshly generated key.
  async rotateToken(): Promise<void> {
    const token = await this.getToken();
    if (!token) {
      return;
    }
    await this.setToken(token);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Lightweight AuthService to provide headers for write operations.
 * It defers to SecureTokenManager for token storage/rotation. This keeps
 * the service testable and separates concerns from the main PokemonService.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenManager = new SecureTokenManager();

  constructor() {}

  // Exposed to allow setting a token (e.g., after login). Kept as Promise to reflect async crypto ops.
  async setToken(token: string): Promise<void> {
    await this.tokenManager.setToken(token);
  }

  // Rotate token key material to reduce risk of static ciphertexts
  async rotate(): Promise<void> {
    await this.tokenManager.rotateToken();
  }

  // Build headers for write endpoints. If no token available, returns empty headers.
  async getAuthHeaders(allowedOrigins: string[] | undefined): Promise<HttpHeaders> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = await this.tokenManager.getToken();
    let result = headers;
    if (token) {
      result = result.set('Authorization', `Bearer ${token}`);
    }

    // Add a client-side origin header only when the origin is allowed by the environment list.
    if (allowedOrigins && allowedOrigins.length > 0) {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : null;
      if (currentOrigin && allowedOrigins.includes(currentOrigin)) {
        result = result.set('X-Client-Origin', currentOrigin);
      }
    }

    return result;
  }
}

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private readonly apiBase = environment.apiBaseUrl || 'http://localhost:8000';
  private readonly pokemonsPath = '/pokemons';
  private readonly pokemonPath = '/pokemon';
  private readonly pokedexPath = '/pokedex';
  private readonly addPokemonPath = '/addPokemon/';
  private readonly allowedOrigins: string[] | undefined = environment.allowedOrigins;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private handleError(error: HttpErrorResponse) {
    // Mirror original behaviour (propagate error) but provide consistent formatting
    // so callers can introspect message/status.
    const payload = {
      message: error.message || 'Unknown error',
      status: error.status || 0,
      error: error.error || null
    };
    return throwError(() => payload);
  }

  getPokedex(): Observable<PokedexEntry[]> {
    const url = `${this.apiBase}${this.pokedexPath}`;
    return this.http.get<PokedexEntry[]>(url).pipe(catchError(err => this.handleError(err)));
  }

  getPokemons(): Observable<Pokemon[]> {
    const url = `${this.apiBase}${this.pokemonsPath}`;
    return this.http.get<Pokemon[]>(url).pipe(catchError(err => this.handleError(err)));
  }

  getPokemon(id: number): Observable<Pokemon> {
    const url = `${this.apiBase}${this.pokemonPath}/${id}`;
    return this.http.get<Pokemon>(url).pipe(catchError(err => this.handleError(err)));
  }

  // Write endpoint: includes optional authentication and client-origin header when available.
  postPokemon(data: any): Observable<any> {
    const url = `${this.apiBase}${this.addPokemonPath}`;

    // getAuthHeaders is async because of crypto; convert to observable with from/switchMap
    return from(this.auth.getAuthHeaders(this.allowedOrigins)).pipe(
      switchMap((headers: HttpHeaders) => this.http.post<any>(url, data, { headers })),
      catchError(err => this.handleError(err))
    );
  }
}
