/**
 * polyfills.ts
 *
 * This file includes polyfills needed by Angular and is loaded before the app.
 *
 * Notes on this refactor:
 * - Preserves the original behavior: Zone.js is still imported and no runtime behavior is changed.
 * - Adds small, non-executing helpers and typed interfaces to document common patterns
 *   (zone flags, allowed origins, secret retrieval). These helpers are intentionally
 *   non-invasive so they do not alter runtime behavior.
 * - Adds guidance (in comments) on restricting allowed origins and secret rotation
 *   for backends / APIs. These are implementation notes only and do not change the
 *   polyfills runtime.
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 *
 * The setup targets "evergreen" browsers (latest versions that auto-update).
 * See https://angular.io/guide/browser-support for details.
 ***************************************************************************************************/

/**
 * IE11 requires the following for NgClass support on SVG elements
 */
// import 'classlist.js';  // Run `npm install --save classlist.js`.

/**
 * Web Animations `@angular/platform-browser/animations`
 * Only required if AnimationBuilder is used within the application and using IE/Edge or Safari.
 */
// import 'web-animations-js';  // Run `npm install --save web-animations-js`.

/**
 * Zone.js flags
 *
 * Zone.js patches many browser APIs by default. If you need to disable specific patches
 * (for example when integrating third-party code), those flags MUST be set before
 * Zone.js is loaded. In typical Angular CLI projects this file is the correct place
 * to document the flags, but note that setting them here after the import will have
 * no effect. To actually apply them at runtime you must set them in a separate file
 * that is imported before Zone.js (see comments below).
 */

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone';  // Included with Angular CLI.

/***************************************************************************************************
 * APPLICATION IMPORTS
 *
 * The items below are helper types and functions intended to improve maintainability and to
 * document best-practices for:
 *  - Preparing Zone.js flags safely
 *  - Managing allowed origins (frontend guidance)
 *  - Stubbing a secure secret retrieval interface for build-time or runtime integration
 *
 * IMPORTANT: None of the helpers below execute any logic that would change existing
 * application behavior. They are utilities/documentation to be used by the application
 * where appropriate.
 ***************************************************************************************************/

/**
 * Optional flags that can be applied to Zone.js to disable specific patches.
 * These keys mirror the examples in the official Zone.js documentation.
 */
export interface ZoneFlags {
  __Zone_disable_requestAnimationFrame?: boolean;
  __Zone_disable_on_property?: boolean;
  /**
   * Events to opt out from patching, e.g. ['scroll', 'mousemove']
   */
  __zone_symbol__UNPATCHED_EVENTS?: string[];
  /**
   * Useful for IE/Edge developer tools integration
   */
  __Zone_enable_cross_context_check?: boolean;
  // Support any additional custom flags
  [key: string]: any;
}

/**
 * Utility to generate a small script that would set Zone flags on the window. This
 * is provided as a helper for teams that wish to programmatically create a tiny
 * script tag or a separate file that must be loaded before Zone.js. No flags are
 * applied by importing this module — call generateFlagsScript and inject the
 * resulting string into a script that runs before Zone.js if you need to change
 * patching behavior.
 */
export class ZoneFlagManager {
  private constructor() { /* static utility class */ }

  /**
   * Produce a compact JS snippet that sets the given flags on window. Caller must
   * ensure the snippet runs before Zone.js is loaded.
   */
  public static generateFlagsScript(flags: ZoneFlags): string {
    const assignments: string[] = [];
    for (const key of Object.keys(flags)) {
      const value = (flags as any)[key];
      const serialized = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
      assignments.push(`(window as any)['${key}'] = ${serialized};`);
    }
    return assignments.join(' ');
  }
}

/**
 * Allowed front-end origins
 *
 * Guidance: Keep the authoritative list of allowed origins in environment configuration
 * at build-time or in a secure server-side configuration. For client-side usage we
 * may optionally expose an immutable list (e.g. via window.__ALLOWED_ORIGINS__) that
 * is set by the server on initial HTML payload rendering. This helper reads that
 * list without modifying it.
 *
 * IMPORTANT: Actual enforcement of allowed origins must happen on the server (CORS
 * configuration) — the client-side list is only for client-side feature gating or
 * UI decisions.
 */
export const getAllowedOrigins = (): string[] => {
  const win = window as any;

  // Common integration points used by various deployment strategies:
  //  - window.__ALLOWED_ORIGINS__ : array of strings injected by server
  //  - window.__ENV_ALLOWED_ORIGINS__ : comma separated string
  const rawArray = Array.isArray(win.__ALLOWED_ORIGINS__) ? win.__ALLOWED_ORIGINS__ : undefined;
  if (Array.isArray(rawArray)) {
    return rawArray.filter((v: unknown) => typeof v === 'string') as string[];
  }

  const rawCsv = typeof win.__ENV_ALLOWED_ORIGINS__ === 'string' ? win.__ENV_ALLOWED_ORIGINS__ : undefined;
  if (typeof rawCsv === 'string' && rawCsv.trim().length > 0) {
    return rawCsv.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  // Fallback: empty list — no client-side assumptions
  return [];
};

/**
 * Secret retrieval stub
 *
 * Frontend applications must not store long-lived secrets. When secrets are required
 * for certain operations (for example signing short-lived tokens), use a secure
 * backend or a dedicated secret manager and rotate them frequently.
 *
 * This function is a placeholder to document an integration point where secure
 * secret retrieval would be implemented (e.g. calling a backend endpoint that
 * returns ephemeral credentials). It intentionally returns a resolved null to avoid
 * changing runtime behavior.
 */
export async function getSecret(_key: string): Promise<string | null> {
  // Implementation note:
  // - On production, do NOT store secrets in the client bundle.
  // - Use backend-mediated ephemeral secrets, or a secure client-side plugin
  //   backed by a platform-specific secure storage when available.
  // - Implement rotation on the server side and keep the client logic minimal.
  return Promise.resolve(null);
}

/**
 * Developer guidance: Restricting origins and enforcing authorization for write endpoints
 *
 * - Enforce allowed origins and CORS policy on the server. Use the getAllowedOrigins list
 *   at build/deploy time to configure the server, not the client.
 * - Require authentication (e.g. JWT access tokens) for all write endpoints and validate
 *   scopes/roles on the server side before allowing state-changing operations.
 * - Rotate secrets regularly and store them in a secure secret manager (HashiCorp Vault,
 *   cloud provider KMS/Secret Manager, etc.). Expose only ephemeral credentials to clients.
 *
 * The above are notes and do not change client runtime behavior. They are included here
 * to guide future maintainers where to implement these server-side controls.
 */
