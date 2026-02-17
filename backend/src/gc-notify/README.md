# GC Notify

GC Notify–compatible API for template-based email and SMS notifications. Sends via shared [adapters](../adapters/README.md); template resolution and rendering use adapters from the same module.

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

- Senders: `GET/POST/PUT/DELETE /gc-notify/v2/senders`
- Templates: `POST /gc-notify/v2/templates`, `PUT /gc-notify/v2/template/:id`, `DELETE /gc-notify/v2/template/:id`

## GC-Specific Adapters

Template and sender infrastructure lives in [adapters](../adapters/README.md) (delivery, template, storage):

| Component | Default | Purpose |
|-----------|---------|---------|
| **Template resolver** | `InMemoryTemplateResolver` | Resolve template by ID |
| **Template renderers** | `{ handlebars, jinja2, ejs, mustache, nunjucks }` | Registry of engine → renderer |
| **Default template engine** | `jinja2` | Engine used when template has no `engine` |
| **Template store** | `InMemoryTemplateStore` | In-memory template storage |
| **Sender store** | `InMemorySenderStore` | In-memory sender storage (reply-to, SMS sender) |

Flow: request → template ID + personalisation → resolver fetches template → engine resolved (`template.engine ?? default`) → registry returns renderer → subject/body produced → shared email/SMS adapter sends. Senders (email reply-to, SMS sender ID) are resolved from the sender store.

To swap implementations, pass options to `GcNotifyModule.forRoot()`:

```ts
GcNotifyModule.forRoot({
  templateResolver: CustomTemplateResolver,
  templateRenderers: { handlebars: HandlebarsTemplateRenderer, jinja2: Jinja2TemplateRenderer },
  defaultTemplateEngine: 'jinja2',  // or from config.gcNotify.defaultTemplateEngine
  senderStore: CustomSenderStore,  // e.g. database-backed
})
```

## Structure

```
gc-notify/
├── gc-notify.service.ts      # Business logic
├── gc-notify.module.ts       # Module wiring
├── v2/core/                  # GC Notify API (notifications, templates read)
│   ├── gc-notify-api.module.ts
│   ├── gc-notify.controller.ts
│   └── schemas/
└── v2/contrib/               # Extensions (senders, templates CRUD)
    ├── gc-notify-management.module.ts
    ├── gc-notify-management.controller.ts
    └── schemas/
```

Adapters (template resolver, renderer, storage) live in [../adapters/](../adapters/README.md).

## Dependencies

- **Shared adapters** – Email/SMS delivery via [AdaptersModule](../adapters/README.md) (nodemailer, twilio, etc.)
- **Config** – Nodemailer and Twilio settings from `configuration.ts`
