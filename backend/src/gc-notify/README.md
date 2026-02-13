# GC Notify

GC Notify–compatible API for template-based email and SMS notifications. Sends via shared [transports](../transports/README.md); template resolution and rendering are gc-notify–specific.

## Core vs Contrib

| Layer | Module | Purpose |
|-------|--------|---------|
| **Core** | `GcNotifyApiModule` | GC Notify API–aligned: send notifications, read templates, bulk send |
| **Contrib** | `GcNotifyManagementModule` | Extensions: manage senders and templates (CRUD) |

**Core** (`v2/core/`) – Notification API:

- `POST /gc-notify/v2/notifications/email` – Send email
- `POST /gc-notify/v2/notifications/sms` – Send SMS
- `POST /gc-notify/v2/notifications/bulk` – Bulk notifications
- `GET /gc-notify/v2/notifications` – List notifications
- `GET /gc-notify/v2/notifications/:id` – Get notification
- `GET /gc-notify/v2/templates` – List templates
- `GET /gc-notify/v2/template/:id` – Get template

**Contrib** (`v2/contrib/`) – Management API (not in official GC Notify spec):

- Senders: `GET/POST/PUT/DELETE /gc-notify/v2/notifications/senders`
- Templates: `POST/PUT/DELETE /gc-notify/v2/templates`, `/template/:id`

## GC-Specific Transports

Template infrastructure lives under `transports/` (distinct from shared email/SMS transports):

| Component | Default | Purpose |
|-----------|---------|---------|
| **Template resolver** | `InMemoryTemplateResolver` | Resolve template by ID |
| **Template renderer** | `HandlebarsTemplateRenderer` | Render template + personalisation |
| **Template store** | `InMemoryTemplateStore` | In-memory template storage |

Flow: request → template ID + personalisation → resolver fetches template → renderer produces subject/body → shared email/SMS transport sends.

To swap implementations, pass `templateResolver` and `templateRenderer` to `GcNotifyModule.forRoot()`.

## Structure

```
gc-notify/
├── gc-notify.service.ts      # Business logic
├── gc-notify.module.ts       # Module wiring
├── transports/               # GC-specific (template resolution)
│   ├── interfaces/           # ITemplateResolver, ITemplateRenderer
│   ├── handlebars/           # HandlebarsTemplateRenderer
│   ├── in-memory-template.resolver.ts
│   └── in-memory-template.store.ts
├── v2/core/                  # GC Notify API (notifications, templates read)
│   ├── gc-notify-api.module.ts
│   ├── gc-notify.controller.ts
│   └── schemas/
└── v2/contrib/               # Extensions (senders, templates CRUD)
    ├── gc-notify-management.module.ts
    ├── gc-notify-management.controller.ts
    └── schemas/
```

## Dependencies

- **Shared transports** – Email/SMS delivery via [TransportsModule](../transports/README.md) (nodemailer, twilio, etc.)
- **Config** – Nodemailer and Twilio settings from `configuration.ts`
