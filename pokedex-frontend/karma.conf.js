'use strict';
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const path = require('path');
const fs = require('fs');

/**
 * Load allowed origins from the environment.
 * Expected format: comma-separated origins (e.g. "https://app.example.com,http://localhost:4200").
 * If not provided, falls back to '*' to preserve existing permissive behavior.
 * This allows deployments to lock origins via env var without changing default behavior locally.
 *
 * @returns {string[]}
 */
function loadAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '*';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Load secret tokens used for authenticating write endpoints.
 * Supports two env-driven approaches (in priority order):
 *  - SECRET_TOKENS_PATH: path to a file containing one token per line (suitable for secrets mounted from secure stores)
 *  - SECRET_TOKENS: comma-separated tokens (for simple setups)
 * If neither is present, an empty array is returned and authentication enforcement is skipped (preserves previous behavior).
 *
 * @returns {string[]}
 */
function loadSecretTokens() {
  const pathEnv = process.env.SECRET_TOKENS_PATH;
  const inline = process.env.SECRET_TOKENS;

  if (pathEnv) {
    try {
      const fileContents = fs.readFileSync(pathEnv, 'utf8');
      return fileContents
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch (err) {
      // If file read fails, log to stderr but do not throw to avoid breaking Karma startup.
      // Fallback to inline env var if available.
      // eslint-disable-next-line no-console
      console.error(`Failed to read SECRET_TOKENS_PATH (${pathEnv}):`, err && err.message ? err.message : err);
    }
  }

  if (inline) {
    return inline.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return [];
}

/**
 * Factory for a simple middleware that sets CORS headers based on allowed origins
 * and enforces authentication for write endpoints (POST/PUT/PATCH/DELETE) when secret tokens are configured.
 *
 * This middleware is optional in effect: if no allowed origins or no secrets are configured,
 * it falls back to permissive behavior so existing local/test setups keep working.
 *
 * @param {Object} logger karma logger object injected by Karma
 * @param {Object} cfg karma config object (unused here but injected)
 */
function secureMiddlewareFactory(logger, cfg) {
  // Capture snapshots at startup. For more advanced rotation, this can be extended to re-read periodically.
  const allowedOrigins = loadAllowedOrigins();
  const secretTokens = loadSecretTokens();

  const enforceAuth = secretTokens.length > 0;

  const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  return function secureMiddleware(req, res, next) {
    try {
      // Determine allowed origin header value
      const requestOrigin = req.headers && (req.headers.origin || req.headers.host);

      let allowOriginValue = '*';

      if (allowedOrigins.length === 1 && allowedOrigins[0] === '*') {
        allowOriginValue = '*';
      } else if (requestOrigin) {
        // If origin exactly matches an allowed origin, echo it back. Otherwise, do not set restrictive header.
        // This keeps behavior explicit and predictable.
        const matched = allowedOrigins.find((o) => o === requestOrigin);
        if (matched) {
          allowOriginValue = matched;
        } else {
          // Not an allowed origin: set to 'null' to be explicit. Browsers will block cross-origin access.
          allowOriginValue = 'null';
        }
      }

      res.setHeader('Access-Control-Allow-Origin', allowOriginValue);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key');

      // Preflight short-circuit
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      // Enforce authentication for write HTTP methods if tokens are configured.
      if (enforceAuth && writeMethods.has(req.method)) {
        const token = (req.headers && (req.headers['x-api-key'] || req.headers['x-api-key'.toLowerCase()])) || null;
        if (!token || !secretTokens.includes(String(token))) {
          // Use 401 to indicate missing or invalid credentials for write operations.
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
      }

      next();
    } catch (err) {
      // Log and continue to avoid taking down the Karma server for middleware errors.
      logger && logger.error && logger.error('secureMiddleware error:', err && err.message ? err.message : err);
      next();
    }
  };
}

secureMiddlewareFactory.$inject = ['logger', 'config'];

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
      // Register the middleware as a Karma plugin. This is a lightweight plugin that provides a factory for middleware.
      { 'middleware:secure': ['factory', secureMiddlewareFactory] }
    ],

    // Ensure our middleware runs before Karma's static handlers to set headers / enforce auth.
    beforeMiddleware: ['secure'],

    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: path.join(__dirname, './coverage/pokedex-frontend'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true
  });
};
