import {
  e2eConfig,
  authHeaders,
  shouldValidateDeliveryViaMailpit,
} from './e2e-config';

const { baseUrl, apiKey, mailpitUrl } = e2eConfig;

const v1 = (path: string) => `${baseUrl}/v1${path}`;

interface NotificationResponse {
  id?: string;
  reference?: string;
  content?: { from_email?: string; body?: string; subject?: string };
  uri?: string;
  template?: { id?: string; version?: number; uri?: string };
}

interface CreateTemplateResponse {
  id?: string;
  name?: string;
  type?: string;
  subject?: string;
  body?: string;
  active?: boolean;
  engine?: string;
  version?: number;
}

interface CreateSenderResponse {
  id?: string;
  type?: string;
  email_address?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

type MailpitMessage = {
  ID?: string;
  To?: Array<{ Address?: string; Email?: string; Name?: string }>;
  From?: { Address?: string; Email?: string; Name?: string };
  Subject?: string;
  Snippet?: string;
};

async function getLatestMailpitMessage(): Promise<MailpitMessage | null> {
  if (!mailpitUrl) return null;
  try {
    const res = await fetch(`${mailpitUrl}/api/v1/message/latest`);
    if (!res.ok) return null;
    return (await res.json()) as MailpitMessage;
  } catch {
    return null;
  }
}

async function getMailpitMessageByRecipient(
  recipientEmail: string,
): Promise<MailpitMessage | null> {
  if (!mailpitUrl) return null;
  try {
    const searchRes = await fetch(
      `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${recipientEmail}`)}&limit=1`,
    );
    if (!searchRes.ok) return null;
    const searchBody = (await searchRes.json()) as {
      messages?: Array<{ ID?: string }>;
    };
    const msgId = searchBody.messages?.[0]?.ID;
    if (!msgId) return null;
    const msgRes = await fetch(`${mailpitUrl}/api/v1/message/${msgId}`);
    if (!msgRes.ok) return null;
    return (await msgRes.json()) as MailpitMessage;
  } catch {
    return null;
  }
}

function messageToContains(
  msg: MailpitMessage | null,
  recipientEmail: string,
): boolean {
  if (!msg?.To?.length) return false;
  return msg.To.some(
    (t) =>
      (t.Address ?? t.Email ?? '').toLowerCase() ===
      recipientEmail.toLowerCase(),
  );
}

describe('Notifications (integration)', () => {
  it('POST /v1/notifications/email without API key returns 401', async () => {
    const res = await fetch(`${baseUrl}/v1/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        template_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/notifications/sms without API key returns 401', async () => {
    const res = await fetch(`${baseUrl}/v1/notifications/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: '+12505551234',
        template_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/notifications/email returns 201', async () => {
    if (!apiKey) return;

    // Create sender (default for from address)
    const createSenderRes = await fetch(v1('/senders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        type: 'email',
        email_address: 'notifications-e2e@example.com',
        is_default: true,
      }),
    });
    expect(createSenderRes.status).toBe(201);
    await createSenderRes.json(); // ensure default sender exists for send

    // Create template (required for send)
    const createTemplateRes = await fetch(v1('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: 'Notifications E2E Template',
        type: 'email',
        subject: 'Test',
        body: 'Hello {{name}}',
        personalisation: { name: 'string' },
        active: true,
        engine: 'handlebars',
      }),
    });
    expect(createTemplateRes.status).toBe(201);
    const template = (await createTemplateRes.json()) as CreateTemplateResponse;
    expect(template.id).toBeDefined();

    // Send email via universal API
    const res = await fetch(`${baseUrl}/v1/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Delivery-Email-Adapter': 'nodemailer',
        ...authHeaders(),
      },
      body: JSON.stringify({
        to: 'test@example.com',
        template_id: template.id,
        personalisation: { name: 'World' },
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as NotificationResponse;
    expect(body.id).toBeDefined();
    expect(body.uri).toMatch(/\/v1\/notifications\//);
  });

  it('full flow: create sender → create template → send email → validate delivery', async () => {
    if (!apiKey) return;

    const e2eReference = `e2e-notif-${Date.now()}`;
    const recipientEmail = `e2e-recipient-${Date.now()}@example.com`;

    // --- 1. Create sender ---
    const createSenderRes = await fetch(v1('/senders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        type: 'email',
        email_address: 'e2e-sender-notif@example.com',
        is_default: true,
      }),
    });

    expect(createSenderRes.status).toBe(201);
    const sender = (await createSenderRes.json()) as CreateSenderResponse;
    expect(sender.id).toBeDefined();
    expect(sender.type).toBe('email');
    expect(sender.email_address).toBe('e2e-sender-notif@example.com');
    expect(sender.is_default).toBe(true);
    expect(sender.created_at).toBeDefined();
    expect(sender.updated_at).toBeDefined();

    // --- 2. Create template ---
    const createTemplateRes = await fetch(v1('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: `E2E Notifications Full Flow ${e2eReference}`,
        type: 'email',
        subject: 'E2E Notif: Hello {{name}}',
        body: 'Hello {{name}}, this is an E2E test. Reference: {{reference}}.',
        personalisation: { name: 'string', reference: 'string' },
        active: true,
        engine: 'handlebars',
      }),
    });

    expect(createTemplateRes.status).toBe(201);
    const template = (await createTemplateRes.json()) as CreateTemplateResponse;
    expect(template.id).toBeDefined();
    expect(template.name).toContain('E2E Notifications Full Flow');
    expect(template.type).toBe('email');
    expect(template.subject).toBe('E2E Notif: Hello {{name}}');
    expect(template.body).toContain('{{reference}}');
    expect(template.active).toBe(true);
    expect(template.engine).toBe('handlebars');
    expect(template.version).toBe(1);

    // --- 3. Send email via universal API ---
    const sendEmailRes = await fetch(`${baseUrl}/v1/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Delivery-Email-Adapter': 'nodemailer',
        ...authHeaders(),
      },
      body: JSON.stringify({
        to: recipientEmail,
        template_id: template.id,
        personalisation: { name: 'World', reference: e2eReference },
        reference: e2eReference,
      }),
    });

    const notificationBody = await sendEmailRes.text();
    if (sendEmailRes.status !== 201) {
      throw new Error(
        `Send email failed (${sendEmailRes.status}). Body: ${notificationBody}`,
      );
    }
    const notification = JSON.parse(notificationBody) as NotificationResponse;
    expect(notification.id).toBeDefined();
    expect(notification.reference).toBe(e2eReference);
    expect(notification.uri).toMatch(
      new RegExp(`/v1/notifications/${notification.id}`),
    );
    expect(notification.content).toBeDefined();
    expect(notification.content?.from_email).toBe(
      'e2e-sender-notif@example.com',
    );
    expect(notification.content?.subject).toBe('E2E Notif: Hello World');
    expect(notification.content?.body).toContain('Hello World');
    expect(notification.content?.body).toContain(e2eReference);
    expect(notification.template?.id).toBe(template.id);
    expect(notification.template?.version).toBe(1);

    // --- 4. Validate delivery (provider-specific; Mailpit when E2E_MAILPIT_URL set) ---
    if (shouldValidateDeliveryViaMailpit()) {
      await new Promise((r) => setTimeout(r, 500));
      const mailpitMessage =
        (await getMailpitMessageByRecipient(recipientEmail)) ??
        (await getLatestMailpitMessage());
      if (mailpitMessage) {
        expect(mailpitMessage.ID).toBeDefined();
        expect(messageToContains(mailpitMessage, recipientEmail)).toBe(true);
        const fromAddr =
          mailpitMessage.From?.Address ?? mailpitMessage.From?.Email ?? '';
        expect(fromAddr).toBe('e2e-sender-notif@example.com');
        expect(mailpitMessage.Subject).toBe('E2E Notif: Hello World');
        const snippet = mailpitMessage.Snippet;
        const msgId = mailpitMessage.ID ?? 'latest';
        const bodyContent =
          (snippet?.length ?? 0) > 0
            ? snippet
            : await (async () => {
                try {
                  const r = await fetch(`${mailpitUrl}/view/${msgId}.txt`);
                  return r.ok ? await r.text() : '';
                } catch {
                  return '';
                }
              })();
        expect(bodyContent).toContain('Hello World');
        expect(bodyContent).toContain(e2eReference);
      }
    }
  });
});
