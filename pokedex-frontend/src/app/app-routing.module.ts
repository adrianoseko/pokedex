import { NgModule, Injectable, APP_INITIALIZER } from '@angular/core';
import { RouterModule, Routes, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PokemonListComponent } from './pokemon-list/pokemon-list.component';
import { PokemonDetailComponent } from './pokemon-detai/pokemon-detai.component';
import { PokedexComponent } from './pokedex/pokedex.component';
import { environment } from '../environments/environment';

// Routing configuration is kept identical to preserve behavior
const ROUTES: Routes = [
  { path: '', component: PokedexComponent },
  { path: 'pokemon-list', component: PokemonListComponent },
  { path: 'pokemon/:id', component: PokemonDetailComponent }
];

/**
 * OriginValidator
 * - Uses environment-driven allowed origins list
 * - Performs a non-blocking validation at app startup (logs warnings/errors)
 * - Can be configured via environment.enforceOrigin to throw and stop initialization
 *
 * Notes:
 * - We intentionally do not change runtime behavior by default. Enabling strict
 *   origin enforcement is opt-in via environment.enforceOrigin = true.
 */
@Injectable({ providedIn: 'root' })
class OriginValidator {
  private allowedOrigins: string[];
  private enforce: boolean;

  constructor() {
    // Read allowed origins from environment; fallback to current origin to preserve behavior
    this.allowedOrigins = Array.isArray(environment.allowedOrigins) && environment.allowedOrigins.length > 0
      ? environment.allowedOrigins
      : [typeof window !== 'undefined' ? window.location.origin : ''];

    this.enforce = !!environment.enforceOrigin;
  }

  validate(): void {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const allowed = this.allowedOrigins.includes(currentOrigin);

    if (!allowed) {
      const msg = `Origin validation failed. Current origin "${currentOrigin}" is not in the allowed list.`;
      if (this.enforce) {
        // If enforcement is enabled, throw to stop startup (opt-in only)
        throw new Error(msg);
      } else {
        // Non-blocking: log a clear warning so operators can act without breaking UX
        // eslint-disable-next-line no-console
        console.warn(msg, { allowedOrigins: this.allowedOrigins });
      }
    }
  }
}

/**
 * SecureStorageService
 * - Abstracts access to secrets and tokens.
 * - Intended to integrate with a secure secret store (rotate secrets) in production.
 * - Here we provide a minimal local fallback behavior to preserve current functionality.
 */
@Injectable({ providedIn: 'root' })
class SecureStorageService {
  // In production this service should call a secure backend or platform secret manager
  // to obtain rotated secrets. For now, use environment or sessionStorage fallback.
  async getSecret(key: string): Promise<string | null> {
    if (!key) return null;

    // Prefer secrets configured via environment (build-time configs)
    const envKey = (environment.secrets && (environment.secrets as any)[key]) || null;
    if (envKey) return envKey as string;

    // Runtime fallback to sessionStorage (non-secure; preserved for compatibility)
    try {
      return Promise.resolve(sessionStorage.getItem(key));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('SecureStorageService: unable to read sessionStorage', err);
      return Promise.resolve(null);
    }
  }

  // Placeholder for future rotate/refresh method
  async refreshSecret(key: string): Promise<string | null> {
    // Implement secret refresh from secure remote store in production
    return this.getSecret(key);
  }
}

/**
 * AuthService
 * - Lightweight authentication abstraction.
 * - Uses SecureStorageService to look up tokens; does not change default app behavior.
 */
@Injectable({ providedIn: 'root' })
class AuthService {
  constructor(private secureStorage: SecureStorageService) {}

  // Returns true if a token exists. Real validation (expiry/signature) should be added
  // on the backend or by extending this method.
  async isAuthenticated(): Promise<boolean> {
    const token = await this.secureStorage.getSecret('auth_token');
    return !!token;
  }

  // Placeholder for role/permission checks. Keep permissive by default to preserve behavior.
  async hasWritePermission(): Promise<boolean> {
    // In future, evaluate token claims or consult an authorization endpoint
    return true;
  }
}

/**
 * AuthGuard
 * - Example guard to protect write endpoints.
 * - Currently permissive to preserve existing application behavior.
 * - To enforce, attach this guard to routes that perform writes and expand checks.
 */
@Injectable({ providedIn: 'root' })
class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Promise<boolean> {
    try {
      const authenticated = await this.auth.isAuthenticated();
      if (!authenticated) {
        // In a real app, redirect to login. Here we remain permissive to avoid behavior changes.
        // eslint-disable-next-line no-console
        console.info('AuthGuard: unauthenticated access attempt (permissive mode)');
      }
      return true; // intentionally permissive; extend to enforce rules
    } catch (err) {
      // On unexpected errors, allow navigation to preserve current behavior but log for operators
      // eslint-disable-next-line no-console
      console.error('AuthGuard error, allowing navigation to preserve behavior', err);
      return true;
    }
  }
}

/**
 * App initializer factory to validate origin at startup.
 */
function createOriginValidatorFactory(originValidator: OriginValidator): () => void {
  return () => originValidator.validate();
}

@NgModule({
  imports: [RouterModule.forRoot(ROUTES)],
  exports: [RouterModule],
  providers: [
    OriginValidator,
    SecureStorageService,
    AuthService,
    AuthGuard,
    {
      provide: APP_INITIALIZER,
      useFactory: createOriginValidatorFactory,
      deps: [OriginValidator],
      multi: true
    }
  ]
})
export class AppRoutingModule {}
