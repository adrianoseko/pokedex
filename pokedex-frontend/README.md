# PokedexFrontend

This project was generated with Angular CLI version 11.2.12.

This README has been reorganized for clarity and to include operational and security guidance for front-end and backend integration.

## Development server

Run `ng serve` for a development server. Navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

Notes:
- For local development the default origin is `http://localhost:4200`.
- If your backend enforces CORS, ensure the backend configuration includes the development origin.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use:

- `ng generate directive|pipe|service|class|guard|interface|enum|module`

This keeps the project structure consistent with Angular style guidelines.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

Example:

- `ng build --prod`

## Running unit tests

Run `ng test` to execute the unit tests via Karma.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via Protractor.

## Security & Backend Integration (Operational Guidance)

The frontend interacts with backend services that must be configured securely. The guidance below describes recommended, environment-driven practices for CORS and for protecting write endpoints.

1. Restrict allowed origins to known frontends
- Do not allow open CORS origins in production. Only permit a whitelist of trusted origins (for example, your staging and production frontend hostnames).
- Drive the whitelist from environment variables so environments can differ without code changes.
- Example environment variable format (comma-separated): `FRONTEND_ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com,http://localhost:4200`
- In your backend, parse the list and compare the `Origin` header against the configured values. Deny requests whose Origin is not in the list.

2. Authentication & Authorization for write endpoints
- Require authentication for any endpoint that modifies state (POST/PUT/PATCH/DELETE).
- Enforce authorization (scopes or roles) so only permitted clients/users can perform write operations.
- Use standards-based tokens (JWT or OAuth2 access tokens). Validate token signatures, expirations, issuer, audience, and required claims or scopes.
- Validate authorization server public keys from a trusted source and cache keys with rotation support.

3. Environment-driven configuration and secret rotation
- Keep secrets (signing keys, client secrets, API keys) out of source control. Use a secure secret store such as HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, or a similar service.
- Drive sensitive values through environment variables and fetch secrets at build/deploy time or at runtime using an authenticated secrets client.
- Rotate secrets regularly and provide automatic key-rollover support for token verification (e.g., refresh JWK sets from the authorization server).
- Example environment names:
  - `AUTH_JWKS_URL` — URL to fetch JSON Web Key Set for token verification
  - `FRONTEND_ALLOWED_ORIGINS` — comma-separated whitelist of allowed origins
  - `SECRETS_BACKEND` — identifier for the secrets provider to use in the current environment

4. Local development considerations
- For convenience in local environments you may include `http://localhost:4200` in the `FRONTEND_ALLOWED_ORIGINS` list.
- Use development tokens or a local dev auth server. Mark these clearly and avoid using production credentials in local setups.

5. Testing and CI/CD
- Ensure your CI/CD pipeline injects the appropriate environment variables and/or secrets at deploy time.
- Validate CORS and auth behaviors in integration tests to catch misconfigurations early.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the Angular CLI Overview and Command Reference page: https://angular.io/cli
