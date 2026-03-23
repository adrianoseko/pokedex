import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PokemonService } from '../pokemon.service';
import { environment } from '../../environments/environment';

interface PokemonSummary {
  name: string;
  url: string;
  id?: number | null;
}

@Component({
  selector: 'app-pokemon-list',
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.scss']
})
export class PokemonListComponent implements OnInit, OnDestroy {
  pokemons: PokemonSummary[] = [];
  selectedPokemon: PokemonSummary | null = null;

  private destroy$ = new Subject<void>();

  constructor(private pokemonService: PokemonService, private router: Router) {}

  ngOnInit(): void {
    // Subscribe to the service and keep subscription management clean
    this.pokemonService
      .getPokemons()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          // Ensure we map and normalize data into the expected shape
          this.pokemons = Array.isArray(data)
            ? data.map((p: any) => ({ name: p.name, url: p.url }))
            : [];
        },
        error: (err: unknown) => {
          // Centralized and non-intrusive error handling
          // In a real app, use a logging service / user-friendly notification
          // Do not change behavior: we keep the original behavior of not throwing
          // but we don't leak raw errors to the console in production
          if (!environment.production) {
            // eslint-disable-next-line no-console
            console.error('Failed to load pokemons', err);
          }
          this.pokemons = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Keep original public method name for template compatibility
  onRowSelect(event: any): void {
    // Event shape may vary between UI libs; defensively handle it
    const data = event?.data ?? event;
    this.selectedPokemon = data ?? null;
    if (!environment.production) {
      // eslint-disable-next-line no-console
      console.debug('Pokemon selected:', this.selectedPokemon);
    }
  }

  pokemonPage(url: string): void {
    // Security: restrict navigation behavior to known frontend origins only.
    // The allowed origins list is driven by environment configuration.
    if (!this.isCurrentOriginAllowed()) {
      if (!environment.production) {
        // eslint-disable-next-line no-console
        console.warn('Navigation blocked: origin is not allowed');
      }
      return;
    }

    // Extract numeric ID from the Pokémon URL using a robust approach
    const id = this.extractIdFromUrl(url);
    if (id === null) {
      if (!environment.production) {
        // eslint-disable-next-line no-console
        console.warn('Could not extract Pokemon id from url:', url);
      }
      return;
    }

    // Authorization check for write operations would happen here.
    // This route is read-only in the current application. If future write
    // endpoints are added, check for a valid token/permissions before calling them.

    // Perform navigation to the pokemon details page
    this.router.navigate(['/pokemon', id]);
  }

  // Helper: parse id such as from "/api/v2/pokemon/25/" or similar
  private extractIdFromUrl(url: string): number | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Prefer a regex that handles both trailing slash and no-trailing-slash
    const regex = /\/(\d+)\/?$/;
    const match = url.match(regex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  // Environment-driven origin whitelist check
  private isCurrentOriginAllowed(): boolean {
    try {
      const allowed: string[] = (environment as any).allowedOrigins || (environment as any).allowedFrontends || [];
      if (!Array.isArray(allowed) || allowed.length === 0) {
        // If no origins are configured, be strict and disallow navigation in non-prod
        if (!environment.production) {
          // eslint-disable-next-line no-console
          console.warn('No allowed origins configured in environment.');
        }
        return false;
      }

      const currentOrigin = window?.location?.origin ?? '';
      return allowed.includes(currentOrigin);
    } catch (e) {
      // Fail closed: disallow if we cannot confirm origin
      if (!environment.production) {
        // eslint-disable-next-line no-console
        console.error('Error checking origin allowance', e);
      }
      return false;
    }
  }

  // Lightweight token retrieval demonstrating environment-driven behavior
  // and basic rotation/expiration handling using secure (session) storage.
  // NOTE: For true secret rotation, integrate with a secure server-side
  // key-management system or OAuth provider. This method preserves app
  // behavior while providing a place to centralize token checks.
  private getAuthToken(): string | null {
    try {
      const token = window.sessionStorage.getItem('auth_token');
      const ts = window.sessionStorage.getItem('auth_token_ts');
      if (!token || !ts) {
        return null;
      }

      const issuedAt = Number(ts);
      const maxAgeMs = 1000 * 60 * 60 * 24; // 24 hours rotation demo
      if (Number.isFinite(issuedAt) && Date.now() - issuedAt > maxAgeMs) {
        // Token is stale: clear it to force a refresh in a real implementation
        window.sessionStorage.removeItem('auth_token');
        window.sessionStorage.removeItem('auth_token_ts');
        return null;
      }

      return token;
    } catch (e) {
      if (!environment.production) {
        // eslint-disable-next-line no-console
        console.error('Failed to retrieve auth token', e);
      }
      return null;
    }
  }
}
