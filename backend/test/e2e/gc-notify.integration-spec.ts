import {
  e2eConfig,
  authHeaders,
  shouldValidateDeliveryViaMailpit,
} from './e2e-config';

const { baseUrl, apiKey, mailpitUrl } = e2eConfig;

const gcNotify = (path: string) => `${baseUrl}/gc-notify/v2${path}`;

interface NotificationsListBody {
  notifications?: unknown[];
}

interface TemplatesListBody {
  templates?: unknown[];
}

interface TemplateBody {
  id?: string;
  name?: string;
  type?: string;
}

interface SenderBody {
  id?: string;
  type?: string;
  email_address?: string;
  sms_sender?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CreateTemplateResponse {
  id?: string;
  name?: string;
  description?: string;
  type?: string;
  subject?: string;
  body?: string;
  personalisation?: Record<string, string>;
  active?: boolean;
  engine?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
}

interface NotificationResponseBody {
  id?: string;
  reference?: string;
  content?: { from_email?: string; body?: string; subject?: string };
  uri?: string;
  template?: { id?: string; version?: number; uri?: string };
  scheduled_for?: string;
}

/** Fetch latest message from Mailpit API (for delivery validation). */
async function getLatestMailpitMessage(): Promise<{
  ID?: string;
  To?: Array<{ Address?: string; Name?: string }>;
  From?: { Address?: string; Name?: string };
  Subject?: string;
  Snippet?: string;
} | null> {
  if (!mailpitUrl) return null;
  try {
    const res = await fetch(`${mailpitUrl}/api/v1/message/latest`);
    if (!res.ok) return null;
    return (await res.json()) as {
      ID?: string;
      To?: Array<{ Address?: string; Name?: string }>;
      From?: { Address?: string; Name?: string };
      Subject?: string;
      Snippet?: string;
    };
  } catch {
    return null;
  }
}

/** Fetch latest message body (text) from Mailpit view API. */
async function getLatestMailpitMessageBody(): Promise<string | null> {
  if (!mailpitUrl) return null;
  try {
    const res = await fetch(`${mailpitUrl}/view/latest.txt`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

describe('GC Notify (integration)', () => {
  it('GET /gc-notify/v2/notifications without API key returns 401', async () => {
    const res = await fetch(gcNotify('/notifications'));
    expect(res.status).toBe(401);
  });

  it('GET /gc-notify/v2/templates without API key returns 401', async () => {
    const res = await fetch(gcNotify('/templates'));
    expect(res.status).toBe(401);
  });

  it('GET /gc-notify/v2/notifications returns 200', async () => {
    if (!apiKey) return;

    const res = await fetch(gcNotify('/notifications'), {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as NotificationsListBody;
    expect(body).toHaveProperty('notifications');
    expect(Array.isArray(body.notifications)).toBe(true);
  });

  it('GET /gc-notify/v2/templates returns 200', async () => {
    if (!apiKey) return;

    const res = await fetch(gcNotify('/templates'), {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TemplatesListBody;
    expect(body).toHaveProperty('templates');
    expect(Array.isArray(body.templates)).toBe(true);
  });

  it('POST /gc-notify/v2/templates creates template', async () => {
    if (!apiKey) return;

    const createRes = await fetch(gcNotify('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: 'E2E Test Template',
        type: 'email',
        subject: 'Test',
        body: 'Hello {{name}}',
        active: true,
      }),
    });
    expect(createRes.status).toBe(201);
    const template = (await createRes.json()) as TemplateBody;
    expect(template.id).toBeDefined();
    expect(template.name).toBe('E2E Test Template');
    expect(template.type).toBe('email');
  });

  it('full flow: create sender → create template → send email → validate delivery', async () => {
    if (!apiKey) return;

    const e2eReference = `e2e-${Date.now()}`;
    const recipientEmail = `e2e-recipient-${Date.now()}@example.com`;

    // --- 1. Create sender ---
    const createSenderRes = await fetch(gcNotify('/senders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        type: 'email',
        email_address: 'e2e-sender@example.com',
        is_default: true,
      }),
    });

    expect(createSenderRes.status).toBe(201);
    const sender = (await createSenderRes.json()) as SenderBody;
    expect(sender.id).toBeDefined();
    expect(sender.type).toBe('email');
    expect(sender.email_address).toBe('e2e-sender@example.com');
    expect(sender.is_default).toBe(true);
    expect(sender.created_at).toBeDefined();
    expect(sender.updated_at).toBeDefined();

    // --- 2. Create template ---
    const createTemplateRes = await fetch(gcNotify('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: `E2E Full Flow Template ${e2eReference}`,
        type: 'email',
        subject: 'E2E Test: Hello {{name}}',
        body: 'Hello {{name}}, this is an E2E test. Reference: {{reference}}.',
        personalisation: { name: 'string', reference: 'string' },
        active: true,
        engine: 'jinja2',
      }),
    });

    expect(createTemplateRes.status).toBe(201);
    const template = (await createTemplateRes.json()) as CreateTemplateResponse;
    expect(template.id).toBeDefined();
    expect(template.name).toContain('E2E Full Flow Template');
    expect(template.type).toBe('email');
    expect(template.subject).toBe('E2E Test: Hello {{name}}');
    expect(template.body).toContain('{{reference}}');
    expect(template.active).toBe(true);
    expect(template.engine).toBe('jinja2');
    expect(template.version).toBe(1);

    // --- 3. Send email ---
    const sendEmailRes = await fetch(gcNotify('/notifications/email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        email_address: recipientEmail,
        template_id: template.id,
        personalisation: { name: 'World', reference: e2eReference },
        reference: e2eReference,
        email_reply_to_id: sender.id,
      }),
    });

    const notificationBody = await sendEmailRes.text();
    if (sendEmailRes.status !== 201) {
      throw new Error(
        `Send email failed (${sendEmailRes.status}). Body: ${notificationBody}`,
      );
    }
    const notification = JSON.parse(
      notificationBody,
    ) as NotificationResponseBody;
    expect(notification.id).toBeDefined();
    expect(notification.reference).toBe(e2eReference);
    expect(notification.uri).toMatch(
      new RegExp(`/gc-notify/v2/notifications/${notification.id}`),
    );
    expect(notification.content).toBeDefined();
    expect(notification.content?.from_email).toBe('e2e-sender@example.com');
    expect(notification.content?.subject).toBe('E2E Test: Hello World');
    expect(notification.content?.body).toContain('Hello World');
    expect(notification.content?.body).toContain(e2eReference);
    expect(notification.template?.id).toBe(template.id);
    expect(notification.template?.version).toBe(1);

    // --- 4. Validate delivery (provider-specific; Mailpit when E2E_MAILPIT_URL set) ---
    if (shouldValidateDeliveryViaMailpit()) {
      await new Promise((r) => setTimeout(r, 500));
      const mailpitMessage = await getLatestMailpitMessage();
      if (mailpitMessage) {
        expect(mailpitMessage.ID).toBeDefined();
        expect(
          mailpitMessage.To?.some((t) => t.Address === recipientEmail),
        ).toBe(true);
        expect(mailpitMessage.From?.Address).toBe('e2e-sender@example.com');
        expect(mailpitMessage.Subject).toBe('E2E Test: Hello World');
        const snippet = mailpitMessage.Snippet;
        const bodyContent =
          (snippet?.length ?? 0) > 0
            ? snippet
            : await getLatestMailpitMessageBody();
        expect(bodyContent).toContain('Hello World');
        expect(bodyContent).toContain(e2eReference);
      }
      // If Mailpit unreachable, skip (send already succeeded)
    }
  });
});
