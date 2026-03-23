import { NgModule, Injectable, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
  HttpClientModule,
  HTTP_INTERCEPTORS,
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { TableModule } from 'primeng/table';
import { AppComponent } from './app.component';
import { PokemonListComponent } from './pokemon-list/pokemon-list.component';
import { PokemonDetailComponent } from './pokemon-detai/pokemon-detai.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PokedexComponent } from './pokedex/pokedex.component';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';

// Note: This file enhances maintainability without changing existing behavior.
// - Adds a lightweight Auth/Secret manager and HTTP interceptor to support
//   environment-driven authentication for write endpoints.
// - Adds an APP_INITIALIZER to optionally preload secrets from a secure store.
// The interceptor is a no-op if no token/config is provided via the environment
// so existing behavior remains unchanged.

@Injectable({ providedIn: 'root' })
class SecretManagerService {
  private secret: string | null = null;

  // Loads a rotated secret from a secure storage endpoint if configured.
  // This method is safe to call even if the app is not configured to use
  // a secret manager (it will simply return without side effects).
  async loadSecret(): Promise<void> {
    if (!environment?.useSecretManager || !environment?.secureStorageUrl) {
      return;
    }

    try {
      const response = await fetch(`${environment.secureStorageUrl}/latest-secret`, {
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('SecretManagerService: failed to fetch secret, status=', response.status);
        return;
      }

      this.secret = await response.text();
    } catch (err) {
      console.error('SecretManagerService: error fetching secret', err);
    }
  }

  getSecret(): string | null {
    return this.secret;
  }
}

@Injectable({ providedIn: 'root' })
class AuthService {
  constructor(private secretManager: SecretManagerService) {}

  // Return a token for Authorization header. Prefer rotated secret from the
  // secret manager, otherwise fall back to an environment-provided token.
  async getToken(): Promise<string | null> {
    const rotated = this.secretManager.getSecret();
    if (rotated) {
      return rotated;
    }

    return (environment && (environment.authToken ?? null)) || null;
  }

  // Determine if the request method is considered a "write" operation.
  isWriteRequest(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase());
  }

  // Simple client-side check to warn if the app is not running from an allowed origin.
  // CORS must still be enforced server-side. We do not block requests here to preserve
  // existing behavior; we only surface a warning for misconfiguration.
  isOriginAllowed(origin: string): boolean {
    const allowed: string[] = (environment && environment.allowedOrigins) || [];
    return allowed.length === 0 ? true : allowed.includes(origin);
  }
}

@Injectable()
class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Client-side origin check (non-blocking) to encourage correct deploy configuration.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!this.auth.isOriginAllowed(origin)) {
      // Don't change request behavior; only warn so we don't break existing apps.
      // Servers should be authoritative about allowed origins.
      // eslint-disable-next-line no-console
      console.warn(`Origin ${origin} is not listed in allowedOrigins. Server-side CORS should enforce origin restrictions.`);
    }

    // Only attempt to attach an Authorization header for write requests.
    if (this.auth.isWriteRequest(req.method)) {
      // getToken may be asynchronous (secret manager); adapt to Observable flow.
      return from(this.auth.getToken()).pipe(
        switchMap(token => {
          if (token) {
            const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
            return next.handle(cloned);
          }
          return next.handle(req);
        })
      );
    }

    // Non-write requests are passed through unchanged.
    return next.handle(req);
  }
}

export function secretLoaderFactory(secretService: SecretManagerService): () => Promise<void> {
  return () => secretService.loadSecret();
}

@NgModule({
  declarations: [
    AppComponent,
    PokemonListComponent,
    PokemonDetailComponent,
    PokedexComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    TableModule,
    HttpClientModule,
    ButtonModule,
    CardModule
  ],
  providers: [
    // Interceptor to attach auth tokens for write endpoints when available.
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    // Optionally preload rotated secrets from a secure storage.
    {
      provide: APP_INITIALIZER,
      useFactory: secretLoaderFactory,
      deps: [SecretManagerService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
