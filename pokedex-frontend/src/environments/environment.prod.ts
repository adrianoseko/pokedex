/*
 * Production environment configuration for the Pokedex frontend.
 *
 * Notes / Design decisions (preserve existing behaviour):
 * - The original file only exported { production: true }.
 * - To follow the developer instruction without changing behaviour, we keep `production: true`
 *   and add structured, opt-in configuration values (allowed origins, write-auth config, api base)
 *   that are safe defaults at build time and can be overridden at runtime via a secure runtime
 *   environment carrier (window.__env) provided by the hosting environment.
 * - This file adds type safety and small helper routines to read runtime overrides safely.
 * - All additions are non-breaking for existing code that only reads `environment.production`.
 */

export interface WriteAuthConfig {
  enabled: boolean; // whether write endpoints require authentication/authorization
  tokenEndpoint: string; // relative/absolute endpoint used to obtain/rotate tokens
  secretStorageKey: string; // key name used by secure storage to fetch secrets
  rotationPolicy: string; // human-readable identifier of rotation policy (e.g. 'auto' | 'manual')
}

export interface Environment {
  production: boolean;
  // Optional convenience values used by the app to enforce CORS-like client side restrictions
  // and to configure authentication for write endpoints. These are additional metadata and
  // do not change the original behaviour of `production: true`.
  apiBaseUrl: string;
  allowedOrigins: string[];
  writeAuth: WriteAuthConfig;
}

/**
 * Reads allowed origins from a runtime carrier if present. The hosting environment can inject
 * a JSON or comma-separated list into `window.__env.ALLOWED_ORIGINS` to allow rotating origin
 * configuration without rebuilding the app.
 *
 * Expected shapes supported (in order of preference):
 * - window.__env.ALLOWED_ORIGINS as an array of strings
 * - window.__env.ALLOWED_ORIGINS as a comma separated string
 * - If not present, falls back to a safe build-time defaults list.
 */
function getAllowedOriginsFromRuntime(): string[] {
  try {
    const carrier = (window as any).__env;
    if (!carrier || carrier.ALLOWED_ORIGINS == null) {
      return getDefaultAllowedOrigins();
    }

    const value = carrier.ALLOWED_ORIGINS;

    if (Array.isArray(value)) {
      return value.map((s) => String(s).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      // Accept either JSON encoded array or comma-separated list
      const trimmed = value.trim();

      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((s) => String(s).trim()).filter(Boolean);
          }
        } catch (_e) {
          // Fall through to comma-split behaviour
        }
      }

      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Unknown type -> fallback
    return getDefaultAllowedOrigins();
  } catch (err) {
    // Do not throw: environment files must be safe to import. Log safely and fallback.
    // Note: console usage is intentional for visibility during runtime troubleshooting.
    // Keep behaviour non-breaking if anything goes wrong here.
    // eslint-disable-next-line no-console
    console.error('Failed to parse runtime allowed origins, falling back to defaults', err);
    return getDefaultAllowedOrigins();
  }
}

function getDefaultAllowedOrigins(): string[] {
  // Build-time safe defaults. Update these to reflect the known frontends for your deployment.
  return [
    'https://pokedex.example.com',
    'https://app.pokedex.example.com'
  ];
}

/**
 * Primary exported environment object.
 * Keep `production: true` exactly as before to preserve behaviour.
 * Additional keys are opt-in metadata that downstream code may use to restrict
 * client-side origin checks and enforce authentication for write endpoints.
 */
export const environment: Environment = {
  production: true,

  // Base API URL used by the frontend. This is a reasonable default and can be replaced
  // at runtime by the hosting environment using window.__env.API_BASE_URL if needed.
  apiBaseUrl: (function getApiBase(): string {
    try {
      const carrier = (window as any).__env;
      if (carrier && typeof carrier.API_BASE_URL === 'string' && carrier.API_BASE_URL.trim()) {
        return carrier.API_BASE_URL.trim();
      }
    } catch (_e) {
      // Ignore and fall back to default
    }
    return 'https://api.pokedex.example.com';
  })(),

  // Restrict allowed origins to known frontends - runtime-overridable via window.__env.ALLOWED_ORIGINS
  allowedOrigins: getAllowedOriginsFromRuntime(),

  // Write endpoint protection metadata. Real enforcement must still occur on the server-side.
  // This exists so the frontend can be configured to require tokens and to request rotation via
  // a trusted secure storage mechanism injected by the hosting environment.
  writeAuth: {
    enabled: true,
    tokenEndpoint: '/auth/token',
    secretStorageKey: 'POKEDEX_WRITE_SECRET',
    rotationPolicy: 'auto'
  }
};
