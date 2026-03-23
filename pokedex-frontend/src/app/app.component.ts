import { Component, OnInit } from '@angular/core';
import { environment } from '../environments/environment';

/**
 * Root application component.
 *
 * Responsibilities:
 * - Provide application title to templates.
 * - Surface environment-driven configuration (read-only) for the rest of the app.
 *
 * Security notes (advice only):
 * - Allowed origins and other runtime configuration should be provided via the environment
 *   (or a secure configuration service) and enforced on the server-side.
 * - Authentication/authorization for write endpoints must be implemented and enforced on
 *   the backend. The frontend should obtain tokens from a secure auth provider and store
 *   them in a secure manner (e.g. short-lived in-memory tokens, refresh tokens in secure storage).
 * - Secrets should be rotated via a secure secret manager and must not be checked into source control.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  /**
   * Application title exposed to templates.
   * Defaults to the original value to preserve behavior.
   */
  title: string;

  /**
   * List of frontend origins allowed to interact with backend resources.
   * Populated from environment configuration to avoid hard-coded values.
   */
  allowedOrigins: string[];

  private static readonly DEFAULT_TITLE = 'pokedex-frontend';

  constructor() {
    // Initialize with safe defaults. Actual values (if any) will be applied in ngOnInit.
    this.title = AppComponent.DEFAULT_TITLE;
    this.allowedOrigins = Array.isArray(environment?.allowedOrigins) ? environment.allowedOrigins : [];
  }

  ngOnInit(): void {
    // Respect environment-provided title if present and non-empty. Preserve original behavior otherwise.
    const envTitle = environment?.appTitle;
    if (typeof envTitle === 'string' && envTitle.trim().length > 0) {
      this.title = envTitle;
    }

    // Ensure allowedOrigins is always an array to avoid template/runtime checks.
    if (!Array.isArray(this.allowedOrigins)) {
      this.allowedOrigins = [];
    }
  }
}
