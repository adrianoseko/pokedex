/**
 * Production environment configuration.
 *
 * This file is used by the Angular build system when the `--configuration=production`
 * flag is provided. Keep this file minimal and free from secrets.
 */

export interface Environment {
  production: boolean;
}

export const environment: Readonly<Environment> = Object.freeze({
  production: true
});
