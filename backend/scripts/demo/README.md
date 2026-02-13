# Business Scenario Demo

A showcase script that demonstrates the GC Notify API end-to-end flow. Run it in your terminal to see each step explained with pretty-printed output.

## Prerequisites

- **API server running** — e.g. `npm run start:dev` in another terminal
- **Devcontainer** — configured for local services (Mailpit, SMTP)

## Usage

```bash
npm run demo
```

Uses `test/e2e/env.local` by default. Override with:

```bash
DEMO_ENV_FILE=path/to/env npm run demo
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

## Config

Same variables as E2E tests:

| Variable          | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `E2E_BASE_URL`    | API base URL (default: `http://localhost:3000`)         |
| `E2E_API_KEY`     | API key for protected endpoints                         |
| `E2E_MAILPIT_URL` | Mailpit API URL (optional; enables delivery validation) |
