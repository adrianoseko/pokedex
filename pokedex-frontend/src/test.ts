// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/dist/zone-testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

declare const require: {
  context(path: string, deep?: boolean, filter?: RegExp): {
    keys(): string[];
    <T = any>(id: string): T;
  };
};

const SPEC_CONTEXT_PATH = './';
const SPEC_FILE_REGEX = /\.spec\.ts$/;

/**
 * Initialize the Angular testing environment.
 */
function initializeTestEnvironment(): void {
  getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
}

/**
 * Resolve the webpack context that contains all spec files.
 */
function resolveSpecContext() {
  return require.context(SPEC_CONTEXT_PATH, true, SPEC_FILE_REGEX);
}

/**
 * Require each spec file so Karma can run them.
 */
function loadTestModules(context: { keys(): string[]; <T = any>(id: string): T; }): void {
  // Use forEach since we are loading for side effects.
  context.keys().forEach(context);
}

try {
  initializeTestEnvironment();
  const context = resolveSpecContext();
  loadTestModules(context);
} catch (error) {
  // Preserve original behavior: re-throw any initialization errors so Karma fails as before.
  throw error;
}
