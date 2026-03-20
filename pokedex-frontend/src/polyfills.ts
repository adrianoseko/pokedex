/**
 * Polyfills for the Pokedex Angular application.
 *
 * This file bundles the polyfills required by Angular and provides helpers
 * and documentation to set Zone.js flags (if needed) before loading Zone.js.
 *
 * Keep behavior identical: Zone.js is imported below and remains required.
 * If you need to set Zone flags to control patching behavior, create a
 * separate file (for example: zone-flags.ts) and import it before this file
 * so flags are applied prior to Zone.js being loaded.
 *
 * See Angular guide: https://angular.io/guide/browser-support
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/**
 * IE11 requires the following for NgClass support on SVG elements
 * Uncomment if you need to support IE11 and install the polyfill:
 *   npm install --save classlist.js
 */
// import 'classlist.js';

/**
 * Web Animations `@angular/platform-browser/animations`
 * Only required if AnimationBuilder is used within the application and using
 * IE/Edge or Safari. Standard animation support in Angular DOES NOT require
 * any polyfills (as of Angular 6.0).
 */
// import 'web-animations-js';

/**
 * Zone.js flag helpers
 *
 * Zone.js patches many browser APIs by default. If you need to disable some
 * of those patches, set the appropriate flags on the global object before
 * Zone.js is loaded. The recommended approach is to create a separate
 * file (e.g. `zone-flags.ts`) that calls applyZoneFlags(...) and import that
 * file before importing Zone.js.
 *
 * Example (in a separate zone-flags.ts):
 *
 *   import { applyZoneFlags } from './polyfills';
 *
 *   applyZoneFlags({
 *     disableRequestAnimationFrame: true,
 *     disableOnProperty: true,
 *     unpatchedEvents: ['scroll', 'mousemove']
 *   });
 *
 * Then import './zone-flags'; before importing Zone.js to ensure flags are
 * effective.
 */

/**
 * A typed representation of commonly used flags for Zone.js configuration.
 */
export interface ZoneFlags {
  /** disable patch for requestAnimationFrame */
  disableRequestAnimationFrame?: boolean;
  /** disable patch for onProperty such as onclick */
  disableOnProperty?: boolean;
  /** list of event names that Zone.js should not patch */
  unpatchedEvents?: string[];
  /** enable cross context check for IE/Edge devtools */
  enableCrossContextCheck?: boolean;
}

/**
 * Apply Zone.js flags on the global object. This function does not import
 * Zone.js; call it from a separate module that is imported before Zone.js
 * so flags take effect.
 */
export function applyZoneFlags(flags: ZoneFlags): void {
  if (!flags) {
    return;
  }

  const globalRef = (window as any) || globalThis as any;

  if (flags.disableRequestAnimationFrame) {
    globalRef.__Zone_disable_requestAnimationFrame = true;
  }

  if (flags.disableOnProperty) {
    globalRef.__Zone_disable_on_property = true;
  }

  if (Array.isArray(flags.unpatchedEvents) && flags.unpatchedEvents.length) {
    globalRef.__zone_symbol__UNPATCHED_EVENTS = flags.unpatchedEvents.slice();
  }

  if (flags.enableCrossContextCheck) {
    globalRef.__Zone_enable_cross_context_check = true;
  }
}

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 * The import must remain; removing or reordering it will change runtime behavior.
 */
import 'zone.js/dist/zone';  // Included with Angular CLI.


/***************************************************************************************************
 * APPLICATION IMPORTS
 */
