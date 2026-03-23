import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Types to describe optional security-related environment configuration
interface SecurityConfig {
  enforce?: boolean; // When true, enforce origin restrictions and auth on write endpoints
  allowedOrigins?: string[]; // List of allowed window.location.origin values
  secureStorageUrl?: string; // Endpoint to retrieve rotating secrets / tokens
  rotationIntervalMs?: number; // How often to rotate secrets
}

type EnvWithSecurity = typeof environment & { security?: SecurityConfig };

// In-memory place to hold the current rotated secret/token. Kept private to this module.
let currentAuthToken: string | null = null;
let rotationTimerId: number | undefined;

const DEFAULT_ROTATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const isWriteMethod = (method?: string): boolean => {
  if (!method) return false;
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
};

const validateOrigin = (allowedOrigins?: string[]): void => {
  try {
    const currentOrigin = window.location.origin;
    if (!allowedOrigins || allowedOrigins.length === 0) {
      console.info('No allowedOrigins configured; skipping origin validation.');
      return;
    }

    const normalized = allowedOrigins.map((o) => o.trim()).filter(Boolean);
    if (!normalized.includes(currentOrigin)) {
      // Enforce by throwing so bootstrapping is aborted. This mirrors server-side restriction intent.
      throw new Error(`Origin not allowed: ${currentOrigin}`);
    }

    console.info(`Origin validated: ${currentOrigin}`);
  } catch (err) {
    // Re-throw to be handled by caller
    throw err;
  }
};

const fetchSecretOnce = async (secureStorageUrl?: string): Promise<string | null> => {
  if (!secureStorageUrl) return null;
  try {
    const resp = await fetch(secureStorageUrl, { method: 'GET', credentials: 'include' });
    if (!resp.ok) {
      console.warn('Failed to fetch secret from secure storage:', resp.status, resp.statusText);
      return null;
    }
    // Expecting a JSON payload like { token: '...' }
    const data = await resp.json();
    if (data && typeof data.token === 'string' && data.token.length > 0) {
      return data.token as string;
    }
    console.warn('Secure storage returned unexpected payload for token.');
    return null;
  } catch (err) {
    console.error('Error fetching secret from secure storage:', err);
    return null;
  }
};

const startSecretRotation = async (secureStorageUrl?: string, rotationIntervalMs?: number): Promise<void> => {
  try {
    const interval = rotationIntervalMs && rotationIntervalMs > 0 ? rotationIntervalMs : DEFAULT_ROTATION_INTERVAL_MS;

    // Initial fetch
    const initial = await fetchSecretOnce(secureStorageUrl);
    if (initial) {
      currentAuthToken = initial;
      console.info('Initial auth token acquired from secure storage.');
    } else {
      console.info('No initial auth token fetched. Write operations will be blocked until a token is available.');
    }

    // Clear any existing timer to avoid duplicates
    if (typeof rotationTimerId !== 'undefined') {
      window.clearInterval(rotationTimerId);
    }

    // Periodically rotate the token. Errors are logged but do not halt the application.
    rotationTimerId = window.setInterval(async () => {
      try {
        const next = await fetchSecretOnce(secureStorageUrl);
        if (next) {
          currentAuthToken = next;
          console.info('Auth token rotated successfully.');
        } else {
          console.warn('Rotation attempt did not return a valid token; keeping existing token.');
        }
      } catch (err) {
        console.error('Error during token rotation:', err);
      }
    }, interval);
  } catch (err) {
    console.error('Failed to start secret rotation:', err);
  }
};

const getAuthToken = (): string | null => currentAuthToken;

// Monkey-patch fetch to enforce authentication/authorization on write endpoints when requested.
// This is opt-in: only enabled if security.enforce is true in the environment. This preserves default behavior
// when security is not configured.
const wrapFetchForAuthEnforcement = (enforce: boolean): void => {
  if (!enforce) {
    console.info('Auth enforcement disabled; leaving window.fetch unchanged.');
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    try {
      const method = init && init.method ? init.method : (typeof input === 'string' ? 'GET' : (input as Request).method);

      if (isWriteMethod(method)) {
        const token = getAuthToken();
        if (!token) {
          console.warn('Blocked write request because no auth token is available.');
          return new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        }

        // Ensure headers exist and include Authorization. Clone headers to avoid mutating original objects passed by caller.
        const headers = new Headers(init && init.headers ? init.headers : (typeof input === 'string' ? undefined : (input as Request).headers));
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        const newInit: RequestInit = Object.assign({}, init, { headers });
        return originalFetch(input, newInit);
      }

      // For non-write methods, pass through unchanged.
      return originalFetch(input, init);
    } catch (err) {
      console.error('Error in wrapped fetch implementation:', err);
      // In case of unexpected errors, surface a generic server error response so callers receive a Response-like object.
      return new Response('Internal Error', { status: 500, statusText: 'Internal Error' });
    }
  };

  console.info('window.fetch wrapped to enforce auth on write endpoints.');
};

const initializeSecurity = async (env: EnvWithSecurity): Promise<void> => {
  const sec: SecurityConfig | undefined = env && (env as any).security;
  if (!sec || !sec.enforce) {
    console.info('Security enforcement is not enabled in environment configuration.');
    return;
  }

  // 1) Validate origin and fail fast if not allowed
  validateOrigin(sec.allowedOrigins);

  // 2) Start rotating secrets from secure storage
  await startSecretRotation(sec.secureStorageUrl, sec.rotationIntervalMs);

  // 3) Wrap fetch to attach tokens for write endpoints and block writes when token absent
  wrapFetchForAuthEnforcement(true);
};

const handleBootstrapError = (error: unknown): void => {
  // Centralized bootstrap error handler for logging and future integrations (reporting, user-facing UI, etc.)
  try {
    console.error('Bootstrap error:', error);
  } catch (ignore) {
    // Ensure nothing thrown from here bubbles out
  }
};

const bootstrapApplication = async (): Promise<void> => {
  try {
    if (environment && environment.production) {
      enableProdMode();
    }

    // Initialize optional security features before bootstrapping Angular. This is opt-in via environment.security.enforce.
    try {
      // Keep a best-effort approach: if initialization throws, let it propagate so it can be handled by the outer catch.
      await initializeSecurity(environment as EnvWithSecurity);
    } catch (err) {
      // If environment.security.enforce is true, initializeSecurity may throw to abort bootstrapping (e.g., invalid origin).
      // Re-throw so the outer catch logs and stops the bootstrap.
      throw err;
    }

    await platformBrowserDynamic().bootstrapModule(AppModule);
  } catch (error) {
    handleBootstrapError(error);
  }
};

// Kick off the application bootstrap
bootstrapApplication();
