import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

const bootstrapApplication = async (): Promise<void> => {
  try {
    if (environment.production) {
      enableProdMode();
    }
    await platformBrowserDynamic().bootstrapModule(AppModule);
  } catch (error) {
    handleBootstrapError(error);
  }
};

const handleBootstrapError = (error: unknown): void => {
  console.error('Bootstrap error:', error);
};

bootstrapApplication();
