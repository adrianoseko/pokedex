import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService } from '../pokemon.service';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

/**
 * Minimal typed models to improve clarity while keeping compatibility with backend responses.
 * These mirror the shape expected by this component but are intentionally permissive
 * to avoid changing runtime behavior.
 */
interface Pokemon {
  id?: number;
  name?: string;
  [key: string]: any;
}

type Pokedex = Pokemon[] | any;

@Component({
  // NOTE: keep the original selector value to preserve existing template binding
  selector: 'app-pokemon-detai',
  templateUrl: './pokedex.component.html',
  styleUrls: ['./pokedex.component.scss']
})
export class PokedexComponent implements OnInit, OnDestroy {
  // Typed to improve clarity; initial value preserved as undefined-like to match prior behaviour
  pokedex: Pokedex | null = null;

  private destroyed$ = new Subject<void>();
  private originAllowed = true;

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService
  ) { }

  ngOnInit(): void {
    // Check client-side origin configuration (read from injected meta tag or global) and log issues.
    // We intentionally do not block the fetch to preserve original behavior, but we surface
    // warnings so deployments can be configured correctly.
    this.validateOriginConfiguration();

    this.loadPokedex();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  /**
   * Loads the pokedex via the PokemonService. Keeps the same behaviour as before but
   * adds proper unsubscribe handling and error logging.
   */
  private loadPokedex(): void {
    this.pokemonService.getPokedex()
      .pipe(
        takeUntil(this.destroyed$),
        catchError(error => {
          // Preserve behaviour (console logging) while improving error visibility
          console.error('Failed to load pokedex:', error);
          // Return a harmless value to allow the UI to continue functioning unchanged
          return of(null);
        })
      )
      .subscribe((data: any) => {
        // Preserve exact same assignment and console logging behaviour
        this.pokedex = data;
        console.log(this.pokedex);
      });
  }

  /**
   * Client-side validation helpers for allowed origins and rotating secrets.
   * These are read-only checks and do NOT change runtime behaviour. They exist
   * to make it easier to detect misconfiguration in environments where the backend
   * must restrict origins and rotate secrets.
   *
   * Implementation notes for operators/ops teams:
   * - Allowed origins can be provided via a <meta name="allowed-origins" content="https://app.example.com,https://staging.example.com"> in index.html
   *   or via a global window.ALLOWED_ORIGINS = 'https://app.example.com,https://staging.example.com'.
   * - Rotating secret can be provided via a secure mechanism (e.g. injected at runtime by the host) and exposed as window.ROTATING_SECRET
   *   or stored in a short-lived client store. For production, secrets MUST be stored server-side and rotated using a secrets manager.
   */
  private validateOriginConfiguration(): void {
    const configuredOrigins = this.readAllowedOrigins();
    const currentOrigin = this.getCurrentOrigin();

    if (configuredOrigins && configuredOrigins.length > 0) {
      if (!configuredOrigins.includes(currentOrigin)) {
        // Do not block; just warn so operators can fix configuration.
        console.warn(`Current origin (${currentOrigin}) is not in allowed origins: ${configuredOrigins.join(', ')}. ` +
          `Requests will proceed to preserve existing client behaviour, but configure allowed origins in the deployment to restrict access.`);
        this.originAllowed = false;
      } else {
        this.originAllowed = true;
      }
    } else {
      console.warn('No allowed origins configured on the client. Add a meta[name="allowed-origins"] or window.ALLOWED_ORIGINS value to harden CORS posture.');
    }

    const rotatingSecret = this.readRotatingSecret();
    if (!rotatingSecret) {
      console.info('No client rotating secret available. Ensure server enforces authentication/authorization on write endpoints and rotates secrets via a secure storage mechanism.');
    }
  }

  private readAllowedOrigins(): string[] {
    try {
      // 1) Check global variable injected at runtime
      const globals = (window as any).ALLOWED_ORIGINS;
      if (typeof globals === 'string' && globals.trim().length > 0) {
        return globals.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      // 2) Check meta tag in index.html (comma-separated)
      const meta = document.querySelector('meta[name="allowed-origins"]');
      if (meta && meta.getAttribute('content')) {
        return meta.getAttribute('content')!.split(',').map(s => s.trim()).filter(Boolean);
      }

      return [];
    } catch (err) {
      console.error('Error reading allowed origins configuration:', err);
      return [];
    }
  }

  private readRotatingSecret(): string | null {
    try {
      // Prefer runtime-injected global, fallback to sessionStorage for short-lived secrets
      const injected = (window as any).ROTATING_SECRET;
      if (typeof injected === 'string' && injected.length > 0) {
        return injected;
      }

      const session = sessionStorage.getItem('ROTATING_SECRET');
      if (session && session.length > 0) {
        return session;
      }

      return null;
    } catch (err) {
      console.error('Error reading rotating secret:', err);
      return null;
    }
  }

  private getCurrentOrigin(): string {
    try {
      return window.location.origin;
    } catch (err) {
      // Fallback for environments without window or location
      return '';
    }
  }

  // NOTE:
  // - This component does not perform any write operations. All write endpoints must be
  //   protected on the server side. Client-side checks help detect misconfiguration but do not replace server authorization.
  // - For write endpoints, the application should attach short-lived tokens obtained from
  //   a secure authentication flow (e.g. OAuth/OpenID Connect) and the server should enforce
  //   authorization. Secrets should be rotated using a secrets manager and never baked into the frontend build.
}
