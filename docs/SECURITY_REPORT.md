# SERINEA Security and Data Management Report

## Controls implemented by the application

### Basic Authentication

`middleware.ts` protects application and API routes with HTTP Basic Authentication. Credentials are read from `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD`, never hard-coded in source control. A missing configuration returns HTTP 503 (fail closed); missing or invalid credentials return HTTP 401 with a `WWW-Authenticate` challenge.

Set the real values only in `.env.local` for local use and in the EC2/deployment secret configuration for hosted use. `.env.example` contains placeholders only.

Basic Authentication is a coursework review gate, not a complete production identity system. A public production service should use TLS, managed identities, credential rotation, audit logging and role-based access control.

### API rate limiting

The middleware applies an in-memory, per-instance sliding-window limiter to API traffic. The window is 60 seconds. Route-specific limits are applied to `walk`, `reach`, `localities`, `compare` and `health`; other API routes use a default limit. Rejected calls receive HTTP 429 and `Retry-After`.

This is useful protection for the single-instance coursework deployment. It is not distributed: a multi-instance production deployment should replace it with a shared store or edge rate limiter.

### Input and database safety

- Shared Zod contracts reject malformed request bodies before services execute.
- Repository queries use parameters rather than string interpolation for caller input.
- RDS connection details are read from `DATABASE_URL`; secrets are not included in code or documentation.
- Backend services are separated from UI components, reducing direct database exposure from the browser.

### Privacy and retention

The comparison and incentive endpoints use the supplied facts to calculate a response and do not persist a user profile or an incentive search history. The optional AI review cache stores a normalized review result with model and policy versions; it is not a user-account profile store.

Avoid placing names, contact details, addresses or other directly identifying information in free-text requests. Operational infrastructure logs must also be configured not to retain secrets or full credential headers.

## Verification

`backend/MiddlewareSecurity.test.ts` verifies that missing and incorrect credentials are rejected, configured credentials are accepted, and absent environment credentials fail closed. The backend test suite and TypeScript/build checks should be run before deployment.

