// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

/**
 * Development environment configuration.
 *
 * NOTE: This file intentionally preserves the original value `production: false` to
 * keep the exact same runtime behavior for code that imports `environment`.
 *
 * Improvements added here are non-breaking helper fields and utilities to:
 * - provide a typed shape for environment configuration,
 * - include an allowlist of known frontends (development defaults only),
 * - provide safe runtime override hooks for tooling that injects runtime settings
 *   (for example: window.__env) without changing the exported `environment` object shape,
 * - provide a safe helper to fetch secrets from a secure runtime storage if available.
 *
 * Be careful not to commit secrets into source control. Use secure storage or build-time
 * secret injection for production values.
 */

export interface AuthConfig {
  /** Roles that are permitted to perform write operations. */
  writeRoles: string[];
  /** Optional OAuth/OpenID client identifier (empty in dev) */
  clientId?: string;
  /** Optional token endpoint (empty in dev) */
  tokenEndpoint?: string;
  /** Rotation policy descriptor (informational) */
  rotationPolicy?: string;
}

export interface Environment {
  production: boolean;
  /** Known frontend origins allowed to interact with APIs in dev. Can be overridden at runtime. */
  allowedOrigins: string[];
  /** Authentication / authorization configuration relevant for write endpoints. */
  auth: AuthConfig;
}

// Keep original behavior: production remains false for this development environment file.
export const environment: Environment = {
  production: false,
  // Default allowed origins for local development. Build/runtime overrides may be applied by
  // secure tooling (for example injecting a window.__env object before app bootstrap).
  allowedOrigins: [
    'http://localhost:4200'
  ],
  // Minimal auth hints for dev only. Do NOT store real secrets here — use secure storage.
  auth: {
    writeRoles: ['admin', 'editor'],
    clientId: '',
    tokenEndpoint: '',
    rotationPolicy: 'secure-storage-rotate'
  }
};

/**
 * Checks whether the provided origin is in the allowlist.
 * This utility is safe to call at runtime and will only consider values present in
 * the static environment.allowedOrigins array unless runtime overrides are applied
 * via `getRuntimeEnvironment()`.
 */
export function isOriginAllowed(origin: string, env: Environment = environment): boolean {
  if (!origin) {
    return false;
  }
  return env.allowedOrigins.indexOf(origin) !== -1;
}

/**
 * Safely attempts to read runtime overrides injected by the host (for example window.__env).
 * If no overrides are found, returns the static environment unchanged.
 *
 * This function does not mutate the exported `environment` constant. Callers that want
 * merged values should use the returned value.
 */
export function getRuntimeEnvironment(): Environment {
  try {
    // Avoid direct reference errors during server-side rendering by checking typeof.
    if (typeof window !== 'undefined' && (window as any).__env && typeof (window as any).__env === 'object') {
      const runtime = (window as any).__env as Partial<Environment>;

      // Merge arrays carefully to avoid unexpected runtime type coercion.
      const merged: Environment = {
        production: runtime.production ?? environment.production,
        allowedOrigins: Array.isArray(runtime.allowedOrigins) && runtime.allowedOrigins.length > 0
          ? runtime.allowedOrigins.slice()
          : environment.allowedOrigins.slice(),
        auth: {
          writeRoles: runtime.auth && Array.isArray(runtime.auth.writeRoles) && runtime.auth.writeRoles.length > 0
            ? runtime.auth.writeRoles.slice()
            : environment.auth.writeRoles.slice(),
          clientId: runtime.auth && typeof runtime.auth.clientId === 'string' ? runtime.auth.clientId : environment.auth.clientId,
          tokenEndpoint: runtime.auth && typeof runtime.auth.tokenEndpoint === 'string' ? runtime.auth.tokenEndpoint : environment.auth.tokenEndpoint,
          rotationPolicy: runtime.auth && typeof runtime.auth.rotationPolicy === 'string' ? runtime.auth.rotationPolicy : environment.auth.rotationPolicy
        }
      };

      return merged;
    }
  } catch (err) {
    // Swallowing errors here keeps behavior identical to the original file (no runtime failures at import time).
    // Any runtime errors when attempting to read overrides should not break the app bootstrap.
    // If needed, instrument logging here in a way that does not expose secrets.
  }

  return environment;
}

/**
 * Secure-secret retrieval helper (best-effort). In production, secrets should be provided by
 * a secure store (e.g., native secret manager, secure HTTP-only cookie, or platform-provided
 * secureStorage). This function attempts to call a known secure storage API if present on the
 * global object and returns null if not available.
 *
 * This is intentionally non-prescriptive and returns null by default in dev so that callers
 * must handle missing secrets gracefully.
 */
export async function fetchSecretFromSecureStorage(key: string): Promise<string | null> {
  if (!key) return null;

  try {
    if (typeof window === 'undefined') return null;

    const globalAny = window as any;

    // Example: a host may expose a secureStorage object that provides getItem asynchronously.
    const storage = globalAny.secureStorage;

    if (!storage) return null;

    if (typeof storage.getItem === 'function') {
      // Support both promise-returning and callback-returning implementations.
      const result = storage.getItem(key);
      if (result && typeof result.then === 'function') {
        return await result;
      }

      // If getItem is synchronous
      return result ?? null;
    }
  } catch (err) {
    // Do not throw; return null to preserve original behavior which had no secret handling.
  }

  return null;
}

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
