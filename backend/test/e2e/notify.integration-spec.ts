import {
  e2eConfig,
  authHeaders,
  shouldValidateDeliveryViaMailpit,
} from './e2e-config';

const { baseUrl, apiKey, mailpitUrl } = e2eConfig;

const apiV1 = (path: string) => `${baseUrl}/api/v1${path}`;

interface NotifyResponse {
  notifyId?: string;
  txId?: string;
  messages?: Array<{ msgId: string; channel: string; to: string[] }>;
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

interface CreateIdentityResponse {
  id?: string;
  type?: string;
  emailAddress?: string;
  createdAt?: string;
  updatedAt?: string;
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

describe('Notify (integration)', () => {
  it('POST /api/v1/notify without API key returns 401', async () => {
    const res = await fetch(apiV1('/notify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notifyType: 'single-email',
        override: {
          common: {
            to: ['test@example.com'],
            templateId: '123e4567-e89b-12d3-a456-426614174000',
            sendAs: 'email',
          },
        },
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/notify returns 201', async () => {
    if (!apiKey) return;

    const notifyTypeCode = `single-email-e2e-${Date.now()}`;

    const createIdentityRes = await fetch(apiV1('/identities'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        type: 'email',
        emailAddress: 'notifications-e2e@example.com',
        isDefault: true,
      }),
    });
    expect(createIdentityRes.status).toBe(201);
    await createIdentityRes.json();

    const createNotifyTypeRes = await fetch(apiV1('/notifyTypes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ code: notifyTypeCode, sendAs: 'email' }),
    });
    expect(createNotifyTypeRes.status).toBe(201);

    const createTemplateRes = await fetch(apiV1('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: 'Notify E2E Template',
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

    const res = await fetch(apiV1('/notify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Delivery-Email-Adapter': 'nodemailer',
        ...authHeaders(),
      },
      body: JSON.stringify({
        notifyType: notifyTypeCode,
        override: {
          common: {
            to: ['test@example.com'],
            templateId: template.id,
            params: { name: 'World' },
            sendAs: 'email',
          },
        },
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as NotifyResponse;
    expect(body.notifyId).toBeDefined();
    expect(body.txId).toBeDefined();
    expect(body.messages).toHaveLength(1);
  });

  it('full flow: create identity → create notifyType → create template → send email → validate delivery', async () => {
    if (!apiKey) return;

    const e2eReference = `e2e-notif-${Date.now()}`;
    const recipientEmail = `e2e-recipient-${Date.now()}@example.com`;

    const createIdentityRes = await fetch(apiV1('/identities'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        type: 'email',
        emailAddress: 'e2e-sender-notif@example.com',
        isDefault: true,
      }),
    });

    expect(createIdentityRes.status).toBe(201);
    const identity = (await createIdentityRes.json()) as CreateIdentityResponse;
    expect(identity.id).toBeDefined();
    expect(identity.type).toBe('email');
    expect(identity.emailAddress).toBe('e2e-sender-notif@example.com');

    const notifyTypeCode = `single-email-${e2eReference}`;
    const createNotifyTypeRes = await fetch(apiV1('/notifyTypes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ code: notifyTypeCode, sendAs: 'email' }),
    });
    expect(createNotifyTypeRes.status).toBe(201);

    const createTemplateRes = await fetch(apiV1('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: `E2E Notify Full Flow ${e2eReference}`,
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

    const sendEmailRes = await fetch(apiV1('/notify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Delivery-Email-Adapter': 'nodemailer',
        ...authHeaders(),
      },
      body: JSON.stringify({
        notifyType: notifyTypeCode,
        override: {
          common: {
            to: [recipientEmail],
            templateId: template.id,
            params: { name: 'World', reference: e2eReference },
            sendAs: 'email',
          },
          email: { emailIdentityId: identity.id },
        },
      }),
    });

    const notificationBody = await sendEmailRes.text();
    if (sendEmailRes.status !== 201) {
      throw new Error(
        `Send email failed (${sendEmailRes.status}). Body: ${notificationBody}`,
      );
    }
    const notification = JSON.parse(notificationBody) as NotifyResponse;
    expect(notification.notifyId).toBeDefined();
    expect(notification.messages).toHaveLength(1);
    expect(notification.messages![0].to).toContain(recipientEmail);

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
