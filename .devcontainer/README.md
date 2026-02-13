# Dev Container Setup

The dev container is built from the Dockerfile (not docker-compose). After the container is up, `postStartCommand` runs `post-start.sh`, which starts the sidecar services (mailpit, postgres) via `docker-compose.yml` and connects the dev container to the `notify-dev` network.

## Configuration

The dev container sets these env vars in `containerEnv`:

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_TRANSPORT` | `nodemailer` | Email transport ([transports README](../backend/src/transports/README.md)) |
| `SMS_TRANSPORT` | `twilio` | SMS transport |
| `NODEMAILER_HOST` | `mailpit` | SMTP host for local email capture |
| `NODEMAILER_PORT` | `1025` | SMTP port |
| `NODEMAILER_FROM` | `noreply@localhost` | Default sender address |

Override in `.env` to test different transports.

**Forwarded ports**: 3000 (Backend API), 5432 (PostgreSQL), 8025 (Mailpit UI)

## Local Development Services

### Email (Mailpit)

Mailpit provides a local SMTP server for testing outgoing email. It's a multi-arch (amd64/arm64) alternative to MailHog. Nodemailer sends to Mailpit by default in this devcontainer.

- **SMTP**: `mailpit:1025` (from app container) / `localhost:1025` (from host)
- **Web UI**: http://localhost:8025 — view all captured emails

The app is configured with `NODEMAILER_HOST=mailpit` so emails sent via the GC Notify API are captured and viewable in the Mailpit UI.

### SMS (Twilio)

Twilio is a cloud API — there is no local Docker simulator. For local development:

- **Without credentials**: SMS is logged to the console (see `TwilioSmsTransport`)
- **With credentials**: Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `.env` to send real SMS

For advanced mocking, Twilio offers [Prism-based OpenAPI mocking](https://www.twilio.com/docs/openapi/mock-api-generation-with-twilio-openapi-spec).
