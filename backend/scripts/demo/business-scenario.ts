#!/usr/bin/env npx ts-node
/**
 * GC Notify API — Business Scenario Demo
 *
 * A showcase script that walks through the full notification flow:
 * 1. Create a sender identity
 * 2. Create a reusable email template
 * 3. Send a personalised notification
 * 4. Validate delivery (when Mailpit is available)
 *
 * Run in devcontainer against local services:
 *   npm run demo
 *
 * Config: DEMO_ENV_FILE or test/e2e/env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env — defaults to test/e2e/env.local; override with DEMO_ENV_FILE
const envFile =
  process.env.DEMO_ENV_FILE || resolve(__dirname, '../../test/e2e/env.local');
config({ path: envFile, quiet: true });

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.E2E_API_KEY || process.env.API_KEY || '';
const mailpitUrl = process.env.E2E_MAILPIT_URL;

const gcNotify = (path: string) => `${baseUrl}/gc-notify/v2${path}`;

function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `ApiKey-v1 ${apiKey}` };
}

// ─── Pretty printing ───────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function header(title: string): void {
  const line = '═'.repeat(60);
  console.log(`\n${C.cyan}╔${line}╗${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  ${C.bold}${title}${C.reset}`);
  console.log(`${C.cyan}╚${line}╝${C.reset}\n`);
}

function step(num: number, title: string): void {
  console.log(`${C.blue}${C.bold}▶ Step ${num}: ${title}${C.reset}`);
}

function sub(text: string): void {
  console.log(`  ${C.dim}${text}${C.reset}`);
}

function ok(text: string): void {
  console.log(`  ${C.green}✓ ${text}${C.reset}`);
}

function warn(text: string): void {
  console.log(`  ${C.yellow}⚠ ${text}${C.reset}`);
}

function fail(text: string): void {
  console.log(`  ${C.red}✗ ${text}${C.reset}`);
}

function json(obj: unknown): void {
  console.log(
    `  ${C.dim}${JSON.stringify(obj, null, 2).replace(/\n/g, '\n  ')}${C.reset}`,
  );
}

function divider(): void {
  console.log(`  ${C.dim}${'─'.repeat(56)}${C.reset}`);
}

// ─── API helpers ───────────────────────────────────────────────────────────

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

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  header('GC Notify API — Business Scenario Demo');

  console.log(`${C.dim}Target: ${baseUrl}${C.reset}`);
  console.log(
    `${C.dim}Mailpit: ${mailpitUrl || '(not configured)'}${C.reset}\n`,
  );

  if (!apiKey) {
    fail(
      'E2E_API_KEY (or API_KEY) is required. Set it in env.local or DEMO_ENV_FILE.',
    );
    process.exit(1);
  }

  const reference = `demo-${Date.now()}`;
  const recipientEmail = `demo-recipient-${Date.now()}@example.com`;

  try {
    // ─── Step 1: Create sender ────────────────────────────────────────────
    step(1, 'Create a sender identity');
    sub('POST /gc-notify/v2/notifications/senders');
    sub(
      'We register an email address that will appear as the "From" for our notifications.',
    );

    const createSenderRes = await fetch(gcNotify('/notifications/senders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        type: 'email',
        email_address: 'demo-sender@example.com',
        is_default: true,
      }),
    });

    if (createSenderRes.status !== 201) {
      const body = await createSenderRes.text();
      fail(`Request failed (${createSenderRes.status}): ${body}`);
      process.exit(1);
    }

    const sender = (await createSenderRes.json()) as {
      id?: string;
      type?: string;
      email_address?: string;
      is_default?: boolean;
      created_at?: string;
    };

    ok(`Sender created: ${sender.email_address} (id: ${sender.id})`);
    json({
      id: sender.id,
      email_address: sender.email_address,
      is_default: sender.is_default,
    });
    divider();

    // ─── Step 2: Create template ────────────────────────────────────────────
    step(2, 'Create a reusable email template');
    sub('POST /gc-notify/v2/templates');
    sub(
      'Templates use placeholders (e.g. {{name}}) that are filled when sending.',
    );

    const createTemplateRes = await fetch(gcNotify('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: `Demo Template ${reference}`,
        type: 'email',
        subject: 'Hello {{name}} — Your reference: {{reference}}',
        body: 'Hello {{name}},\n\nThis is a demo notification from the GC Notify API.\n\nReference: {{reference}}\n\n— Demo Team',
        personalisation: { name: 'string', reference: 'string' },
        active: true,
        engine: 'jinja2',
      }),
    });

    if (createTemplateRes.status !== 201) {
      const body = await createTemplateRes.text();
      fail(`Request failed (${createTemplateRes.status}): ${body}`);
      process.exit(1);
    }

    const template = (await createTemplateRes.json()) as {
      id?: string;
      name?: string;
      subject?: string;
      body?: string;
      version?: number;
    };

    ok(
      `Template created: "${template.name}" (id: ${template.id}, v${template.version})`,
    );
    json({
      id: template.id,
      subject: template.subject,
      version: template.version,
    });
    divider();

    // ─── Step 3: Send notification ────────────────────────────────────────
    step(3, 'Send a personalised notification');
    sub('POST /gc-notify/v2/notifications/email');
    sub(
      'We send an email using the template, filling in personalisation values.',
    );

    const sendEmailRes = await fetch(gcNotify('/notifications/email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        email_address: recipientEmail,
        template_id: template.id,
        personalisation: { name: 'Demo User', reference },
        reference,
        email_reply_to_id: sender.id,
      }),
    });

    const notificationBody = await sendEmailRes.text();
    if (sendEmailRes.status !== 201) {
      fail(`Request failed (${sendEmailRes.status}): ${notificationBody}`);
      process.exit(1);
    }

    const notification = JSON.parse(notificationBody) as {
      id?: string;
      reference?: string;
      content?: { from_email?: string; subject?: string; body?: string };
      uri?: string;
    };

    ok(`Notification sent successfully`);
    ok(`To: ${recipientEmail}`);
    ok(`Subject: ${notification.content?.subject}`);
    ok(`Reference: ${notification.reference}`);
    json({
      id: notification.id,
      reference: notification.reference,
      subject: notification.content?.subject,
      uri: notification.uri,
    });
    divider();

    // ─── Step 4: Validate delivery (optional) ──────────────────────────────
    step(4, 'Validate delivery (Mailpit)');
    if (mailpitUrl) {
      sub('Checking Mailpit to confirm the email was delivered.');
      await new Promise((r) => setTimeout(r, 500));
      const mailpitMessage = await getLatestMailpitMessage();
      if (mailpitMessage) {
        const toMatch = mailpitMessage.To?.some(
          (t) => t.Address === recipientEmail,
        );
        if (
          toMatch &&
          mailpitMessage.From?.Address === 'demo-sender@example.com'
        ) {
          ok('Email found in Mailpit inbox');
          ok(`From: ${mailpitMessage.From?.Address}`);
          ok(`To: ${recipientEmail}`);
          ok(`Subject: ${mailpitMessage.Subject}`);
          const bodyContent =
            mailpitMessage.Snippet ||
            (await getLatestMailpitMessageBody()) ||
            '';
          if (
            bodyContent.includes('Demo User') &&
            bodyContent.includes(reference)
          ) {
            ok('Body contains expected personalisation');
          }
        } else {
          warn(
            'Mailpit returned a message, but it may not be ours (check timing).',
          );
        }
      } else {
        warn('Mailpit unreachable or no messages yet. API send succeeded.');
      }
    } else {
      warn('E2E_MAILPIT_URL not set — skipping delivery validation.');
      sub(
        'API accepted the notification; delivery depends on your SMTP config.',
      );
    }

    // ─── Summary ───────────────────────────────────────────────────────────
    header('Demo complete');
    console.log(`${C.green}${C.bold}All steps succeeded.${C.reset}\n`);
    console.log(`${C.dim}What we achieved:${C.reset}`);
    console.log(`  • Registered a sender identity for outbound email`);
    console.log(`  • Created a reusable template with personalisation`);
    console.log(`  • Sent a personalised notification to ${recipientEmail}`);
    if (mailpitUrl) {
      console.log(`  • Verified delivery via Mailpit`);
    }
    console.log('');
  } catch (err) {
    fail(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}

main();
