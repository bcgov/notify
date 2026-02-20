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

## Running against Docker image

To run the demos against a containerised backend instead of `npm run start:dev`:

**1. Build the image** (from repo root):

```bash
docker build -t notify-api ./backend
```

**2. Start the container** with env files and host access for Mailpit/Postgres:

```bash
docker run -d --name notify-api-backend -p 3000:3000 \
  --add-host=host.docker.internal:host-gateway \
  -e NODEMAILER_HOST=host.docker.internal \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/notify \
  --env-file backend/.env \
  --env-file backend/.env.local \
  notify-api
```

`NODEMAILER_HOST` and `DATABASE_URL` must point to `host.docker.internal` so the container can reach Mailpit and Postgres on the host (e.g. devcontainer sidecars). Alternatively, add these overrides to `backend/.env.local` instead of using `-e`.

**3. Run the demo** (from repo root, with backend container running):

```bash
npm run demo
# or
npm run demo:dual-transport
npm run demo:dual-email-adapter
```

**4. Stop the container** when done:

```bash
docker stop notify-api-backend && docker rm notify-api-backend
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

## Dual Transport Demo (CHES + GC Notify)

Sends the same personalised email via both CHES and GC Notify (passthrough):

```bash
npm run demo:dual-transport
```

Required env (or CLI args):

| Variable               | CLI arg                 | Description                                      |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| `GC_NOTIFY_API_KEY`    | `--gc-notify-api-key`   | Your GC Notify API key (for passthrough)         |
| `GC_NOTIFY_TEMPLATE_ID`| `--template-id`         | UUID of template in GC Notify (must exist there) |
| `DEMO_NAME`            | `--name`                | Value for `{{name}}` personalisation             |
| `DEMO_EMAIL`           | `--email`               | Recipient email address                           |
| `DEMO_SENDER_EMAIL`    | `--sender-email`        | Verified CHES sender address (for email_reply_to_id) |
| `DEMO_SUBJECT`        | `--subject`             | Value for {{subject}} (default: "Hello", mirrors GC Notify) |

For CHES: backend must have `CHES_CLIENT_ID`, `CHES_CLIENT_SECRET`, `CHES_BASE_URL`, `CHES_TOKEN_URL` in `backend/.env.local`. The script creates a sender via the API and uses `email_reply_to_id` instead of `CHES_FROM`.

Example:

```bash
GC_NOTIFY_API_KEY=your-key \
GC_NOTIFY_TEMPLATE_ID=uuid-of-your-template \
DEMO_NAME="Jane" \
DEMO_EMAIL=recipient@example.com \
DEMO_SENDER_EMAIL=your-verified-ches-email@yourdomain.gov.bc.ca \
npm run demo:dual-transport
```

Or with CLI args:

```bash
npm run demo:dual-transport -- --name "Jane" --email recipient@example.com --sender-email your-verified@domain.gov.bc.ca --template-id <uuid> --gc-notify-api-key <key>
```

The template content (Handlebars) used for CHES and equivalent for GC Notify:

- **Heading 1**: This is a greeting
- **Heading 2**: Personalised for you
- **Paragraph**: Hello {{name}}

## Config

Same variables as E2E tests. Base config from `test/e2e/env.local`; local overrides (credentials, adapter choice) from `backend/.env.local`.

| Variable              | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `E2E_BASE_URL`        | API base URL (default: `http://localhost:3000`)         |
| `E2E_API_KEY`         | API key for protected endpoints                         |
| `E2E_MAILPIT_URL`     | Mailpit API URL (optional; enables delivery validation) |
| `DEMO_LOCAL_ENV_FILE` | Override path to local overrides file (default: `backend/.env.local`) |
