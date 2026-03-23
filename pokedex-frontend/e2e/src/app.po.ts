import { browser, by, element, ElementFinder } from 'protractor';

/**
 * AppPage is a Page Object representing the root of the application used in E2E tests.
 *
 * Notes for maintainers:
 * - Keep behavior identical to original implementation.
 * - The file includes helper utilities to prepare for restricting allowed origins and
 *   for adding authentication/authorization for write endpoints in tests. These helpers
 *   are environment-driven and intentionally inert (no side-effects) in order to avoid
 *   changing current test behavior.
 *
 * Environment-driven configuration:
 *   - ALLOWED_ORIGINS: comma-separated list of known frontend origins used by CORS policy
 *   - SECRET_STORE_PATH: path to a secure secret storage (used by AuthHelper in future)
 *
 * Secrets should be rotated via a secure secret store (not checked into source).
 */
export class AppPage {
  private readonly contentSelector = 'app-root .content span';

  /**
   * Navigate to the configured baseUrl for protractor.
   * Returns the underlying promise returned by protractor browser.get to preserve behavior.
   */
  async navigateTo(): Promise<unknown> {
    try {
      return browser.get(browser.baseUrl);
    } catch (err) {
      // Preserve original behavior while adding actionable logs for debugging.
      // Rethrow to avoid swallowing errors that tests may rely on.
      // tslint:disable-next-line:no-console
      console.error('[AppPage.navigateTo] Failed to navigate to baseUrl:', browser.baseUrl, err);
      throw err;
    }
  }

  /**
   * Get the text of the main title span element.
   */
  async getTitleText(): Promise<string> {
    try {
      return this.getContentElement().getText();
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.error('[AppPage.getTitleText] Failed to get title text for selector:', this.contentSelector, err);
      throw err;
    }
  }

  /**
   * Low-level accessor for the content element. Encapsulated to centralize selector usage.
   */
  getContentElement(): ElementFinder {
    return element(by.css(this.contentSelector));
  }
}

/**
 * Helper to read allowed origins for the application from the environment.
 * This is intentionally read-only and not used by the existing tests to avoid changing behavior.
 */
export function getAllowedOriginsFromEnv(): string[] {
  const raw = (process && process.env && process.env.ALLOWED_ORIGINS) || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * AuthHelper outlines how tests could obtain tokens for write endpoints, using a secure store.
 * Implementations should use a secret manager and rotate secrets; this helper is a placeholder
 * that does not perform any network I/O by default to avoid changing current test behavior.
 */
export class AuthHelper {
  /**
   * Placeholder for obtaining a bearer token from a secure secret store.
   * Current implementation returns undefined to preserve existing behavior.
   */
  static async getBearerToken(): Promise<string | undefined> {
    // In future: integrate with a secret manager SDK (Vault, AWS Secrets Manager, Azure Key Vault)
    // to fetch rotated secrets and exchange them for tokens. This placeholder intentionally
    // does nothing so e2e tests have no behavioral change.
    return undefined;
  }
}
