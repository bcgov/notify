# Integration E2E Tests

End-to-end tests that hit a **running** API server over HTTP. Use these for smoke testing and demos against local or deployed instances.

## Prerequisite

**The API server must be running before you run integration tests.**

- **Local:** `npm run start:dev` (in another terminal)
- **Staging/Deployed:** Ensure the target instance is up

## Usage

| Command | Target |
|---------|--------|
| `npm run test:e2e:local` | Local devcontainer (default env) |
| `npm run test:e2e:staging` | Staging (from `env.staging`) |
| `npm run test:e2e:integration` | Uses `E2E_ENV_FILE` or `env.local` |

## Config

Env files:

- `env.local` — Base config for local devcontainer (committed)
- `backend/.env.local` — Local overrides (credentials, adapter choice; gitignored, created from `.env.local.example`)
- `env.staging.example` — Template; copy to `env.staging` and fill in
- `env.staging` — Staging config (gitignored)

Override via env vars:

```bash
E2E_BASE_URL=https://notify.example.com E2E_API_KEY=xxx npm run test:e2e:integration
E2E_LOCAL_ENV_FILE=path/to/.env.local npm run test:e2e:integration
```

## Variables

| Variable | Description |
|----------|-------------|
| `E2E_BASE_URL` | API base URL (default: `http://localhost:3000`) |
| `E2E_API_KEY` | API key for protected endpoints |
| `E2E_MAILPIT_URL` | Mailpit API URL (optional; enables Mailpit delivery validation when set) |
| `E2E_LOCAL_ENV_FILE` | Override path to local overrides file (default: `backend/.env.local`) |
| `E2E_SKIP_DELIVERY_VALIDATION` | Set to `true` to skip delivery validation (use for staging with real SMTP) |
| `E2E_DELIVERY_VALIDATOR` | `mailpit` \| `none` — which validator to use (default: mailpit when `E2E_MAILPIT_URL` set) |

## Full Flow Test

The GC Notify full-flow test (`full flow: create sender → create template → send email → validate delivery`) exercises the complete business case:

1. **Create sender** — POST `/gc-notify/v2/notifications/senders`, asserts response
2. **Create template** — POST `/gc-notify/v2/templates`, asserts response
3. **Send email** — POST `/gc-notify/v2/notifications/email`, asserts response
4. **Validate delivery** — Provider-specific; runs only when configured

### Delivery validation (portable)

| Environment | Config | Behavior |
|-------------|--------|----------|
| **Local (Mailpit)** | `E2E_MAILPIT_URL=http://localhost:8025` | Validates via Mailpit API |
| **Staging (real SMTP)** | `E2E_SKIP_DELIVERY_VALIDATION=true` or omit `E2E_MAILPIT_URL` | Skips delivery validation; API assertions still run |
| **Explicit none** | `E2E_DELIVERY_VALIDATOR=none` | Skips delivery validation |
