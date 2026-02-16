# Business Scenario Demo

A showcase script that demonstrates the GC Notify API end-to-end flow. Run it in your terminal to see each step explained with pretty-printed output.

## Prerequisites

- **API server running** — e.g. `npm run start:dev` in another terminal
- **Devcontainer** — configured for local services (Mailpit, SMTP)

## Usage

```bash
npm run demo
```

Loads `test/e2e/env.local` then `backend/.env.local` (local overrides). Override with:

```bash
DEMO_ENV_FILE=path/to/base/env DEMO_LOCAL_ENV_FILE=path/to/.env.local npm run demo
```

For staging (when configured):

```bash
npm run demo:staging
```

## What It Does

1. **Create sender** — Registers an email identity for outbound notifications
2. **Create template** — Defines a reusable email with `{{name}}` and `{{reference}}` placeholders
3. **Send notification** — Sends a personalised email using the template
4. **Validate delivery** — When Mailpit is configured, confirms the email arrived

## Running with CHES

To use **CHES** (Common Hosted Email Service) for email delivery, add to `backend/.env.local`:

```
EMAIL_ADAPTER=ches
CHES_CLIENT_ID=your-client-id
CHES_CLIENT_SECRET=your-client-secret
```

Ensure `CHES_BASE_URL` and `CHES_TOKEN_URL` are set (from `.env` or `.env.example`). Optionally set `CHES_FROM` for the sender address (must be a verified CHES sender).

Then start the backend and run the demo:

```bash
npm run start:dev   # in one terminal
npm run demo        # in another
```

## Config

Same variables as E2E tests. Base config from `test/e2e/env.local`; local overrides (credentials, adapter choice) from `backend/.env.local`.

| Variable              | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `E2E_BASE_URL`        | API base URL (default: `http://localhost:3000`)         |
| `E2E_API_KEY`         | API key for protected endpoints                         |
| `E2E_MAILPIT_URL`     | Mailpit API URL (optional; enables delivery validation) |
| `DEMO_LOCAL_ENV_FILE` | Override path to local overrides file (default: `backend/.env.local`) |
