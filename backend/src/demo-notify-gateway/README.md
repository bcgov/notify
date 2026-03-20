# Demo Notify Gateway

Temporary module for **Kong-style demos**: authenticate a fixed gateway client header (e.g. `x-consumer-custom-id`) without `AUTH_BOOTSTRAP_PATH`, inject `X-Delivery-Email-Adapter` from env so callers do not send it, and seed an email identity + tenant defaults for the sender (`from`).

**Security:** Only use behind an API gateway that **sets** the client id header and blocks clients from spoofing it. Treat `DEMO_NOTIFY_GATEWAY_CLIENT_ID` as a shared secret for allowlisted routes only.

---

## Configure

### 1. Enable the module (already wired in this repo)

The app imports `DemoNotifyGatewayModule` and chains middleware in `AppModule`; `AuthModule` registers the demo auth strategy when this module is present. If you are merging into another branch, ensure that wiring matches the current `AppModule` and `AuthModule`.

### 2. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEMO_NOTIFY_GATEWAY_AUTH_ENABLED` | For demo | `true` or `1` to turn on demo auth + seed + header injection. **Unset or `false`:** demo strategy returns immediately (no principal), inject middleware does nothing; normal `gateway-service-client` / `gc-notify-api-key` and bootstrap apply. |
| `DEMO_NOTIFY_GATEWAY_CLIENT_ID` | Yes* | Value that must match the gateway-injected client id header. |
| `DEMO_NOTIFY_SENDER_EMAIL` | Yes* | Email used to create/find an identity; merged into defaults as `emailIdentityId` for `DEMO_NOTIFY_WORKSPACE_ID`. |
| `DEMO_NOTIFY_EMAIL_ADAPTER` | Recommended | e.g. `nodemailer` or `ches` — injected as `X-Delivery-Email-Adapter` for allowlisted requests (caller header wins if already set). |
| `DEMO_NOTIFY_WORKSPACE_ID` | No | Defaults to `default` (must exist in the in-memory workspace registry). |
| `DEMO_NOTIFY_GATEWAY_HEADER` | No | Header name for the client id; falls back to `AUTH_GATEWAY_SERVICE_CLIENT_ID_HEADER`, then `x-consumer-custom-id`. |
| `DEMO_NOTIFY_AUTH_PATHS` | No | Comma-separated rules: each `METHOD` + `:` + path (e.g. one entry `POST` + `:/api/v1/notify`). Default is notify-only. |
| `DEMO_NOTIFY_SMS_ADAPTER` | No | Optional; injected as `X-Delivery-Sms-Adapter` when valid. |

\*If auth is enabled but `DEMO_NOTIFY_GATEWAY_CLIENT_ID` is unset, the strategy and header middleware no-op (gateway/bootstrap behavior unchanged for that path).

If `DEMO_NOTIFY_SENDER_EMAIL` is unset while auth is enabled, seeding is skipped (log warning).

### 3. Inline `POST /notify` (separate product flag)

To send without stored notify types or templates, set in app config:

`NOTIFY_INLINE_EMAIL_ENABLED=true`

See `NotifyService` / `.env.example`. Demo gateway auth and inline notify are independent flags; enable either or both as needed.

### When all `DEMO_*` / demo flags are off

- **`DEMO_NOTIFY_GATEWAY_AUTH_ENABLED`** unset, `false`, or not `true`/`1`: no header injection, no demo seed, `DemoGatewayNotifyAuthStrategy` always returns `null` on the first line.
- Leftover **`DEMO_NOTIFY_EMAIL_ADAPTER`** / **`DEMO_NOTIFY_GATEWAY_CLIENT_ID`** etc. are **ignored** until auth is enabled (middleware and strategy both gate on `DEMO_NOTIFY_GATEWAY_AUTH_ENABLED`).
- **`NOTIFY_INLINE_EMAIL_ENABLED`:** leave `false` or unset for classic template + `notifyType` `POST /notify` only.

The demo module stays in the app graph; it is inert until `DEMO_NOTIFY_GATEWAY_AUTH_ENABLED` is on. Automated checks: `test/demo-notify-gateway/demo-disabled-auth-flow.spec.ts`.

---

## How it behaves

1. **`DemoInjectDeliveryHeadersMiddleware`** runs **before** `DeliveryContextMiddleware`. For allowlisted method+path and matching gateway client id, it may set `x-delivery-email-adapter` / `x-delivery-sms-adapter` from env if not already present.
2. **`DemoGatewayNotifyAuthStrategy`** runs (prepended by `PrincipalResolver` when registered) and returns a service principal for the same path + header match **before** `gateway-service-client` runs — avoiding “unknown service client” when bootstrap is empty.
3. **`DemoNotifySeedService`** on startup creates or finds an identity for `DEMO_NOTIFY_SENDER_EMAIL` and merges `emailIdentityId` into defaults for the demo workspace.

---

## Remove this module

1. **Delete** the folder `src/demo-notify-gateway/` (this README and all sources).
2. **`AppModule`**
   - Remove `DemoNotifyGatewayModule` from `imports`.
   - Remove `implements NestModule` and `configure()` unless you still need it for another reason.
   - Remove imports of `DemoInjectDeliveryHeadersMiddleware`, `DeliveryContextMiddleware` from `AppModule` if only used there.
3. **`DeliveryContextModule`**
   - Implement `NestModule` again and register middleware only for delivery context, e.g. `configure(consumer) { consumer.apply(DeliveryContextMiddleware).forRoutes('*path'); }`
   - Optionally **stop exporting** `DeliveryContextMiddleware` if nothing else needs it (only required while `AppModule` applied it explicitly).
4. **`AuthModule`**
   - Remove `DemoNotifyGatewayModule` from `imports`.
   - Remove imports of `DemoGatewayNotifyAuthStrategy` and `DemoNotifyGatewayModule`.
   - Restore `AUTH_STRATEGIES` `useFactory` to only `gatewayServiceClientAuthStrategy` and `gcNotifyApiKeyAuthStrategy` with `inject` for those two only.
5. **`PrincipalResolver`**
   - Remove the block that prepends `demo-gateway-notify` when missing from configured strategy names.
6. **`AuthSource` / types**
   - Remove `'demo-gateway-notify'` from the `AuthSource` union in `src/common/auth/types.ts` if nothing else references it.
7. **Env / docs**
   - Remove `DEMO_*` entries from deployment config and `.env.example` if you added them there.

After removal, rely on `AUTH_BOOTSTRAP_JSON` / bootstrap file + normal gateway auth, or `ApiKey-v1` auth, and set `X-Delivery-Email-Adapter` (or global `EMAIL_ADAPTER`) as before.
