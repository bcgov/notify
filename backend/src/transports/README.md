# Transports

Shared email and SMS transports for use by gc-notify, notifications, and other API packages. Transports are pluggable and selected via configuration.

## Configuration

Transport selection is driven by environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_TRANSPORT` | `nodemailer` | Email transport name (see registry) |
| `SMS_TRANSPORT` | `twilio` | SMS transport name |

The app registers `TransportsModule.forRoot()` in `app.module.ts` using the registry in `transport.registry.ts`.

## Using transports in a service

Transports are provided globally. Inject them via the DI tokens:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EMAIL_TRANSPORT, SMS_TRANSPORT } from '../transports/tokens';
import type { IEmailTransport, ISmsTransport } from '../transports/interfaces';

@Injectable()
export class MyService {
  constructor(
    @Inject(EMAIL_TRANSPORT) private readonly emailTransport: IEmailTransport,
    @Inject(SMS_TRANSPORT) private readonly smsTransport: ISmsTransport,
  ) {}

  async sendEmail(to: string, subject: string, body: string) {
    return this.emailTransport.send({ to, subject, body });
  }

  async sendSms(to: string, body: string) {
    return this.smsTransport.send({ to, body });
  }
}
```

## Available transports

| Name | Type | Description |
|------|------|-------------|
| `nodemailer` | Email | SMTP via Nodemailer (e.g. Mailpit for local dev) |
| `twilio` | SMS | Twilio API (logs only when credentials are unset) |

## Adding a new transport

1. **Implement the interface** – Create a class implementing `IEmailTransport` or `ISmsTransport` in a new file under `nodemailer/`, `twilio/`, or a new subdirectory.

2. **Register it** – Add the class to `transport.registry.ts`:

   ```typescript
   export const EMAIL_TRANSPORT_REGISTRY = {
     nodemailer: NodemailerEmailTransport,
     ches: ChesEmailTransport,  // new
   };
   ```

3. **Wire configuration** – Add any required config keys to `configuration.ts` and `.env.example`.

4. **Use it** – Set `EMAIL_TRANSPORT=ches` or `SMS_TRANSPORT=...` in `.env` or `containerEnv`.

## Structure

```
transports/
├── interfaces/          # IEmailTransport, ISmsTransport, option types
├── nodemailer/         # NodemailerEmailTransport
├── twilio/             # TwilioSmsTransport
├── transport.registry.ts   # Name → class mapping
├── transports.module.ts   # NestJS module (forRoot)
├── tokens.ts           # DI injection tokens
└── README.md           # This file
```
