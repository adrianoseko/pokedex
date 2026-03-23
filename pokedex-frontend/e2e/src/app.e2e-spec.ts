/*
 * Refactored e2e test for the pokedex-frontend app.
 *
 * Developer notes (non-functional, guidance only):
 * - Allowed origins and authentication/authorization for write endpoints should be configured on the server.
 *   Use environment-driven origin lists (e.g. process.env.ALLOWED_ORIGINS) and a secret manager for rotating
 *   credentials (e.g. HashiCorp Vault, AWS Secrets Manager). Do not hard-code secrets in source.
 * - The test below preserves the original behavior: it navigates to the app and asserts the welcome message,
 *   then asserts there are no SEVERE browser logs. The comments and Config class are intended to show how
 *   environment-driven configuration can be introduced without changing test behavior.
 */

import { browser, logging } from 'protractor';
import { AppPage } from './app.po';

// Expected application title text (keeps the original behavior)
const EXPECTED_TITLE = 'pokedex-frontend app is running!';

// Lightweight config loader for e2e tests. This demonstrates reading runtime configuration from the
// environment (e.g. allowed origins, base URL, auth toggles) so server-side restrictions and secrets
// can be driven by environment and secret stores. This class is informational for tests and does not
// change the behavior of the existing assertions.
class AppTestConfig {
  readonly baseUrl: string | undefined;
  readonly allowedOrigins: string[];
  readonly authEnabled: boolean;

  private constructor(baseUrl?: string, allowedOrigins: string[] = ['http://localhost:4200'], authEnabled = false) {
    this.baseUrl = baseUrl;
    this.allowedOrigins = allowedOrigins;
    this.authEnabled = authEnabled;
  }

  static load(): AppTestConfig {
    const baseUrl = process.env.E2E_BASE_URL;
    const allowedEnv = process.env.ALLOWED_ORIGINS;
    const allowedOrigins = allowedEnv ? allowedEnv.split(',').map(s => s.trim()).filter(Boolean) : ['http://localhost:4200'];
    const authEnabled = process.env.E2E_AUTH_ENABLED === 'true';
    return new AppTestConfig(baseUrl, allowedOrigins, authEnabled);
  }
}

// Utility for fetching and asserting browser logs. Encapsulates log retrieval and provides
// clearer error messages. Behavior is equivalent to the original: tests will fail if severe
// logs are present.
class BrowserLogInspector {
  static async getBrowserLogs(): Promise<logging.Entry[]> {
    try {
      return await browser.manage().logs().get(logging.Type.BROWSER);
    } catch (err) {
      // Re-throw a clearer error so test output is actionable when log retrieval fails.
      const message = err && (err as Error).message ? (err as Error).message : String(err);
      throw new Error(`Unable to retrieve browser logs: ${message}`);
    }
  }

  static async assertNoSevereLogs(): Promise<void> {
    const logs = await this.getBrowserLogs();
    const severe = logs.filter(entry => entry.level === logging.Level.SEVERE);
    if (severe.length > 0) {
      const formatted = severe.map(e => `${e.level.name}: ${e.message}`).join('\n');
      // Throwing an Error fails the test with actionable context.
      throw new Error(`Severe browser logs detected:\n${formatted}`);
    }
  }
}

describe('workspace-project App', () => {
  let page: AppPage;
  const config = AppTestConfig.load();

  beforeEach(() => {
    // The AppPage constructor and navigation behavior are unchanged.
    page = new AppPage();

    // Optional: If a base URL is provided via env, we could use it to navigate explicitly.
    // We intentionally do not change navigation behavior here to preserve original tests.
    // Example (commented): if (config.baseUrl) { browser.baseUrl = config.baseUrl; }
  });

  it('should display welcome message', async () => {
    await page.navigateTo();
    const title = await page.getTitleText();
    expect(title).toEqual(EXPECTED_TITLE);
  });

  afterEach(async () => {
    // Assert that there are no SEVERE errors emitted from the browser. This preserves the
    // original intent while providing a clearer failure message when severe logs exist.
    await BrowserLogInspector.assertNoSevereLogs();
  });
});
