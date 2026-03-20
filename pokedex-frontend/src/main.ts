import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

/**
 * Responsible for bootstrapping the Angular application.
 * Encapsulates bootstrap flow and error handling to improve readability and testability.
 */
class AppBootstrapper {
  /**
   * Bootstraps the root Angular module. Enables production mode when configured.
   */
  static async bootstrap(): Promise<void> {
    try {
      if (environment.production) {
        enableProdMode();
      }

      await platformBrowserDynamic().bootstrapModule(AppModule);
    } catch (error: unknown) {
      AppBootstrapper.handleBootstrapError(error);
    }
  }

  /**
   * Centralized bootstrap error handler.
   */
  private static handleBootstrapError(error: unknown): void {
    console.error('Bootstrap error:', error);
  }
}

// Kick off the application bootstrap
AppBootstrapper.bootstrap();
