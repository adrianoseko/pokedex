// @ts-check
// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const fs = require('fs');
const path = require('path');
const { SpecReporter, StacktraceOption } = require('jasmine-spec-reporter');
const dotenv = require('dotenv');

dotenv.config();

/** Default values preserved to keep existing behaviour when no env is set */
const DEFAULT_BASE_URL = 'http://localhost:4200/';
const DEFAULT_SPECS = ['./src/**/*.e2e-spec.ts'];
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:4200'];
const DEFAULT_BROWSER_NAME = 'chrome';

/**
 * Load allowed origins from environment. Uses comma-separated list in ALLOWED_ORIGINS.
 * Falls back to DEFAULT_ALLOWED_ORIGINS if not present or invalid.
 * @returns {string[]}
 */
function loadAllowedOrigins() {
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS.slice();
  try {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  } catch (err) {
    // preserve original behaviour by falling back
    console.warn('ALLOWED_ORIGINS parse failed, falling back to defaults');
    return DEFAULT_ALLOWED_ORIGINS.slice();
  }
}

/**
 * Load authentication token from secure storage or environment.
 * Priority: secure file pointed by SECURE_STORE_PATH (JSON { "authToken": "..." }) -> AUTH_TOKEN env
 * Returns null if not available. Does not throw to avoid breaking default behaviour.
 * @returns {string|null}
 */
function loadAuthToken() {
  const storePath = process.env.SECURE_STORE_PATH;
  if (storePath) {
    try {
      const content = fs.readFileSync(path.resolve(storePath), { encoding: 'utf8' });
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.authToken === 'string' && parsed.authToken.length > 0) {
        return parsed.authToken;
      }
    } catch (err) {
      console.warn('Failed to read secure store from', storePath, '-', err.message);
      // fallback to environment token below
    }
  }

  const envToken = process.env.AUTH_TOKEN;
  return envToken && envToken.length > 0 ? envToken : null;
}

/**
 * Produces a client-side mock module that, when injected into the browser, will:
 * - Add Authorization header for write requests (POST/PUT/PATCH/DELETE) if authToken supplied
 * - Optionally enforce that the app's origin is one of the allowedOrigins
 * This is optional and only added when enabled via environment variables so default test behaviour is preserved.
 *
 * @param {string|null} authToken
 * @param {string[]} allowedOrigins
 * @param {boolean} enforceOrigin
 * @returns {{name: string, script: function}} an object consumable by browser.addMockModule
 */
function createAuthInterceptorModule(authToken, allowedOrigins, enforceOrigin) {
  function interceptorModule(token, origins, enforce) {
    // This function will be stringified and run in the browser context.
    (function () {
      function isWriteMethod(method) {
        return /^(POST|PUT|PATCH|DELETE)$/i.test(method);
      }

      // Optionally enforce origin restriction
      try {
        if (enforce && Array.isArray(origins) && origins.length > 0) {
          var currentOrigin = window.location.origin;
          if (origins.indexOf(currentOrigin) === -1) {
            // Throwing here will make tests fail fast if they are run from an unexpected origin.
            throw new Error('Origin not allowed: ' + currentOrigin);
          }
        }
      } catch (e) {
        // Surface the error in the browser console to aid debugging of test environment
        // Do not swallow the error; rethrow so tests can detect misconfiguration
        setTimeout(function () { throw e; }, 0);
      }

      // Patch fetch to inject Authorization header for write requests
      if (window.fetch) {
        var originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
          try {
            var method = (init && init.method) || 'GET';
            if (token && isWriteMethod(method)) {
              init = init || {};
              init.headers = init.headers || {};
              // If Headers instance, try to set via append/set
              try {
                if (typeof init.headers.append === 'function') {
                  init.headers.append('Authorization', 'Bearer ' + token);
                } else {
                  init.headers['Authorization'] = 'Bearer ' + token;
                }
              } catch (err) {
                init.headers['Authorization'] = 'Bearer ' + token;
              }
            }
          } catch (e) {
            // don't break non-related tests
            console && console.warn && console.warn('fetch interceptor error', e);
          }
          return originalFetch(input, init);
        };
      }

      // Patch XMLHttpRequest to inject Authorization header for write requests
      try {
        var originalXHR = window.XMLHttpRequest;
        function PatchedXHR() {
          var xhr = new originalXHR();
          var originalOpen = xhr.open;
          var methodForThisRequest = null;
          xhr.open = function (method) {
            methodForThisRequest = arguments[0];
            return originalOpen.apply(xhr, arguments);
          };
          var originalSend = xhr.send;
          xhr.send = function () {
            try {
              if (token && isWriteMethod(methodForThisRequest)) {
                try {
                  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                } catch (err) {
                  // ignore if header cannot be set
                }
              }
            } catch (err) {
              console && console.warn && console.warn('XHR interceptor error', err);
            }
            return originalSend.apply(xhr, arguments);
          };
          return xhr;
        }
        // Copy static properties
        for (var k in originalXHR) {
          if (Object.prototype.hasOwnProperty.call(originalXHR, k)) {
            try { PatchedXHR[k] = originalXHR[k]; } catch (e) {}
          }
        }
        window.XMLHttpRequest = PatchedXHR;
      } catch (e) {
        // ignore if XHR cannot be patched in this environment
      }
    })();
  }

  return {
    name: 'authInterceptor',
    script: interceptorModule,
    args: [authToken, allowedOrigins, enforceOrigin]
  };
}

/**
 * Construct the exported config object. Kept synchronous to match protractor expectations,
 * but onPrepare is async to allow async setup.
 * @returns { import('protractor').Config }
 */
function buildConfig() {
  const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;

  return {
    allScriptsTimeout: 11000,
    specs: DEFAULT_SPECS.slice(),
    capabilities: {
      browserName: process.env.BROWSER_NAME || DEFAULT_BROWSER_NAME
    },
    directConnect: true,
    SELENIUM_PROMISE_MANAGER: false,
    baseUrl,
    framework: 'jasmine',
    jasmineNodeOpts: {
      showColors: true,
      defaultTimeoutInterval: 30000,
      print: function () {}
    },
    // onPrepare can be async and return a promise
    onPrepare: async function () {
      // register ts-node for .ts e2e specs
      require('ts-node').register({
        project: path.join(__dirname, './tsconfig.json')
      });

      // Add pretty reporter
      jasmine.getEnv().addReporter(new SpecReporter({
        spec: {
          displayStacktrace: StacktraceOption.PRETTY
        }
      }));

      // Optional: add ability to inject auth headers for write endpoints and enforce allowed origins
      const enableAuth = process.env.ENABLE_TEST_AUTH === 'true';
      const enforceOrigins = process.env.ENABLE_ORIGIN_RESTRICTION === 'true';
      const authToken = loadAuthToken();
      const allowedOrigins = loadAllowedOrigins();

      // Only add the interceptor if explicitly enabled to preserve default behaviour
      if (enableAuth || enforceOrigins) {
        try {
          // browser.addMockModule accepts function and arguments; Protractor will stringify function
          const module = createAuthInterceptorModule(authToken, allowedOrigins, enforceOrigins);
          if (module && module.script) {
            // Protractor API: browser.addMockModule(name, scriptFn, ...args)
            // We're using global `browser` which is available in protractor runtime
            if (typeof browser.addMockModule === 'function') {
              browser.addMockModule(module.name, module.script, ...(module.args || []));
            }
          }
        } catch (err) {
          // Do not break tests if mock module fails to register; log for debugging
          console.warn('Failed to register auth/origin interceptor for e2e tests:', err && err.message ? err.message : err);
        }
      }
    }
  };
}

/** Export final config object */
exports.config = buildConfig();
