// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/dist/zone-testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

type RequireContext<T = unknown> = {
  context(path: string, deep?: boolean, filter?: RegExp): {
    keys(): string[];
    <R = T>(id: string): R;
  };
};

declare const require: RequireContext;

/**
 * Initialize the Angular testing environment with clear error reporting.
 * Preserves original behaviour (throws on failure) while providing context.
 */
function initAngularTestEnvironment(): void {
  try {
    getTestBed().initTestEnvironment(
      BrowserDynamicTestingModule,
      platformBrowserDynamicTesting()
    );
  } catch (err) {
    // Surface a clearer error while preserving original behaviour
    // (original would have thrown; we log for easier debugging then rethrow)
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Angular test environment:', err);
    throw err;
  }
}

/**
 * Load all test modules discovered by require.context.
 * Adds per-module error context while preserving eager-loading behaviour.
 */
function loadTestModules(ctx: ReturnType<typeof require['context']>): void {
  if (!ctx || typeof ctx.keys !== 'function') {
    // Nothing to load; preserve original behaviour by throwing a descriptive error
    const e = new Error('Test require.context is not available.');
    // eslint-disable-next-line no-console
    console.error(e);
    throw e;
  }

  const keys = ctx.keys();
  // preserve original eager loading behaviour but add per-module error context
  keys.forEach((key) => {
    try {
      ctx(key);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Error while loading test module "${key}":`, err);
      throw err;
    }
  });
}

/**
 * Environment-driven utilities for tests that need to simulate origin restrictions
 * and authentication. These helpers do not change test runner behaviour unless used
 * explicitly by tests.
 */

type SecureStoreSource = Record<string, string> | undefined;

class SecureStore {
  private source: SecureStoreSource;

  constructor(source?: SecureStoreSource) {
    this.source = source ?? (typeof (globalThis as any).__SECURE_STORE__ !== 'undefined'
      ? (globalThis as any).__SECURE_STORE__
      : undefined);
  }

  getSecret(key: string): string | undefined {
    if (!this.source) return undefined;
    return this.source[key];
  }

  // Rotate secrets by replacing the internal source. Tests can call this to simulate rotation.
  rotate(newSource: SecureStoreSource): void {
    this.source = newSource;
  }
}

function getAllowedOrigins(): string[] {
  // Prefer a runtime injected env object (common in Angular setups) otherwise fall back to process.env
  const env = (globalThis as any).__env__ ?? (typeof process !== 'undefined' ? (process.env as any) : undefined);
  const raw = env?.ALLOWED_ORIGINS ?? env?.allowedOrigins;
  if (!raw) {
    // Default used by many dev setups; does not change existing test discovery behaviour.
    return ['http://localhost:4200'];
  }
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

function buildAuthHeadersForWrite(secretKey = 'WRITE_TOKEN'): Record<string, string> {
  const store = new SecureStore();
  const token = store.getSecret(secretKey)
    ?? (typeof (globalThis as any).__DEFAULT_WRITE_TOKEN__ !== 'undefined'
      ? String((globalThis as any).__DEFAULT_WRITE_TOKEN__)
      : undefined);
  if (!token) {
    // Do not throw here to avoid changing test runner; return empty headers to preserve behaviour.
    // eslint-disable-next-line no-console
    console.warn('No write token available from secure store; returning empty auth headers.');
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

// Initialize environment and load tests
initAngularTestEnvironment();
const context = require.context('./', true, /\.spec\.ts$/);
loadTestModules(context);

// Export helpers for tests that need to enforce origin checks or authenticated writes
export {
  SecureStore,
  getAllowedOrigins,
  buildAuthHeadersForWrite
};
