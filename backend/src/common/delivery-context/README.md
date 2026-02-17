# DeliveryContext

Global, request-scoped context for selecting email and SMS delivery adapters. Used by gc-notify, notifications, and other API modules to determine which transport (CHES, Nodemailer, Twilio, or GC Notify facade) handles each request.

## What It Does

- **Per-request adapter selection** — Each HTTP request gets a `DeliveryContext` that specifies which email and SMS adapters to use.
- **AsyncLocalStorage isolation** — Context is stored in Node's `AsyncLocalStorage`, so it is available anywhere in the request pipeline without passing it explicitly.
- **Middleware-driven** — `DeliveryContextMiddleware` runs early, resolves the context, and runs the rest of the request within that context.

## How It Works

```
Request → DeliveryContextMiddleware
            │
            ├─ resolveContext(req)  ← headers, then config
            │
            └─ storage.run(ctx, () => next())
                    │
                    └─ Controller → Service → DeliveryAdapterResolver
                                         │
                                         └─ getEmailAdapter() / getSmsAdapter()
                                               → returns adapter for current request
```

1. **Middleware** runs first. It calls `resolveContext(req)` to build a `DeliveryContext` from headers (if present and valid) or system config.
2. **Storage** runs the rest of the request inside `storage.run(ctx, fn)`, so the context is available for the entire request.
3. **DeliveryContextService** reads the context from storage. Services inject it and call `getEmailAdapterKey()`, `getSmsAdapterKey()`, etc.
4. **DeliveryAdapterResolver** uses the context to return the correct adapter instance (or `'gc-notify-client'` when the key is `gc-notify`).

## Usage

### In a Service

Inject `DeliveryAdapterResolver` and use it instead of `EMAIL_ADAPTER` / `SMS_ADAPTER`:

```ts
constructor(
  private readonly deliveryAdapterResolver: DeliveryAdapterResolver,
) {}

async sendEmail(body: CreateEmailNotificationRequest) {
  const adapter = this.deliveryAdapterResolver.getEmailAdapter();

  if (adapter === GC_NOTIFY_CLIENT) {
    // Forward to real GC Notify API
    return this.gcNotifyApiClient.sendEmail(body, authHeader);
  }

  // Use universal adapter (CHES, Nodemailer)
  const rendered = await this.render(body);
  await (adapter as IEmailTransport).send(rendered);
}
```

### Reading Context Directly

Inject `DeliveryContextService` when you need the raw keys:

```ts
constructor(
  private readonly deliveryContextService: DeliveryContextService,
) {}

someMethod() {
  const emailKey = this.deliveryContextService.getEmailAdapterKey(); // 'nodemailer' | 'ches' | 'gc-notify'
  const smsKey = this.deliveryContextService.getSmsAdapterKey();     // 'twilio' | 'gc-notify'
  const templateSource = this.deliveryContextService.getTemplateSource(); // 'local'
  const templateEngine = this.deliveryContextService.getTemplateEngine();  // 'jinja2'
}
```

## Resolution Order

1. **Header override** — If present and valid, used for that request.
2. **System config** — Fallback from `EMAIL_ADAPTER` / `SMS_ADAPTER` env vars.

## Header Override

Per-request adapter selection via HTTP headers (useful for testing or explicit routing):

| Header                      | Values                    | Description        |
|-----------------------------|---------------------------|--------------------|
| `X-Delivery-Email-Adapter`   | `nodemailer`, `ches`, `gc-notify` | Email adapter for this request |
| `X-Delivery-Sms-Adapter`    | `twilio`, `gc-notify`     | SMS adapter for this request  |

Example:

```bash
curl -X POST https://api.example.com/gc-notify/v2/notifications/email \
  -H "Authorization: ApiKey-v1 your-key" \
  -H "X-Delivery-Email-Adapter: ches" \
  -H "Content-Type: application/json" \
  -d '{"email_address":"user@example.com","template_id":"..."}'
```

Invalid or unknown header values are ignored; the system config is used instead.

## Configuration

System defaults (used when headers are absent or invalid):

| Variable        | Default     | Description                    |
|----------------|-------------|--------------------------------|
| `EMAIL_ADAPTER`| `nodemailer`| Email adapter: `nodemailer`, `ches`, `gc-notify` |
| `SMS_ADAPTER`  | `twilio`    | SMS adapter: `twilio`, `gc-notify` |
| `GC_NOTIFY_DEFAULT_TEMPLATE_ENGINE` | `jinja2` | Template engine for local mode |

## Adapter Keys

| Key         | Email | SMS  | Behavior                                      |
|------------|-------|------|-----------------------------------------------|
| `nodemailer` | ✓   | —    | Send via SMTP (e.g. Mailpit)                  |
| `ches`     | ✓     | —    | Send via CHES API                             |
| `twilio`   | —     | ✓    | Send via Twilio                               |
| `gc-notify`| ✓     | ✓    | Forward to real GC Notify API (facade mode)   |

When the key is `gc-notify`, `DeliveryAdapterResolver` returns `GC_NOTIFY_CLIENT` instead of an `IEmailTransport` / `ISmsTransport`. The caller must use `GcNotifyApiClient` instead.

## Module Setup

Import `DeliveryContextModule` in your app. It applies the middleware globally and exports `DeliveryContextService` and `DeliveryAdapterResolver`:

```ts
@Module({
  imports: [DeliveryContextModule],
  // ...
})
export class AppModule {}
```

The module implements `NestModule` and configures the middleware for all routes (`*`).

## Future Extensibility

The middleware's `resolveContext()` can be extended to support:

1. **Tenant config** — `X-Tenant-Id` → lookup in `delivery.tenants[id]` for multi-tenant routing.
2. **API config** — Route or API path → lookup in `delivery.apis[key]`.

Resolution order would be: header → tenant → API → system default.

## Files

| File                       | Purpose                                                |
|----------------------------|--------------------------------------------------------|
| `delivery-context.interface.ts` | `DeliveryContext` type definition                  |
| `delivery-context.storage.ts`  | `AsyncLocalStorage` wrapper with `run()` and `get()` |
| `delivery-context.middleware.ts` | Resolves context and runs request in storage       |
| `delivery-context.service.ts`  | Reads context; throws if middleware did not run    |
| `delivery-adapter.resolver.ts` | Maps context keys to adapter instances             |
| `delivery-context.module.ts`   | Nest module wiring                                  |
