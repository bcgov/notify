# Dev Container Setup

The dev container uses **Docker-in-Docker (DinD)**. After the container is up, `postStartCommand` runs `post-start.sh`, which starts the sidecar services (mailpit, postgres) via `docker-compose.yml` inside the devcontainer. Sidecars publish ports to the devcontainer's localhost.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_ADAPTER` | `nodemailer` | Email adapter ([adapters README](../backend/src/adapters/README.md)) |
| `SMS_ADAPTER` | `twilio` | SMS adapter |
| `NODEMAILER_HOST` | `localhost` | SMTP host (DinD: sidecars publish to localhost) |
| `NODEMAILER_PORT` | `1025` | SMTP port |
| `NODEMAILER_FROM` | `noreply@localhost` | Default sender address |

Override in `.env` to test different adapters.

**Forwarded ports**: 3000 (Backend API), 5432 (PostgreSQL), 1025 (Mailpit SMTP), 8025 (Mailpit UI). The host can reach these via localhost after forwarding.

## Local Development Services

### Email (Mailpit)

Mailpit provides a local SMTP server for testing outgoing email. It's a multi-arch (amd64/arm64) alternative to MailHog.

- **SMTP**: `localhost:1025` (from inside devcontainer) / forwarded to host
- **Web UI**: http://localhost:8025 — view all captured emails

The app is configured with `NODEMAILER_HOST=localhost` so emails sent via the GC Notify API are captured and viewable in the Mailpit UI.

### SMS (Twilio)

Twilio is a cloud API — there is no local Docker simulator. For local development:

- **Without credentials**: SMS is logged to the console (see `TwilioSmsTransport`)
- **With credentials**: Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `.env` to send real SMS

For advanced mocking, Twilio offers [Prism-based OpenAPI mocking](https://www.twilio.com/docs/openapi/mock-api-generation-with-twilio-openapi-spec).
