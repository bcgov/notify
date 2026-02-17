#!/usr/bin/env npx ts-node
/**
 * Dual Transport Demo — CHES + GC Notify
 *
 * Sends the same personalised email via two transports:
 * 1. CHES (Common Hosted Email Service) — via local backend template + CHES API
 * 2. GC Notify (passthrough facade) — forwards to real api.notification.canada.ca
 *
 * Template content (Handlebars):
 *   <h1>This is a greeting</h1>
 *   <h2>Personalised for you</h2>
 *   <p>Hello {{name}}</p>
 *
 * Run in devcontainer against local services:
 *   npm run demo:dual-transport
 *
 * Required env (or CLI args):
 *   GC_NOTIFY_API_KEY     — Your GC Notify API key (for facade)
 *   GC_NOTIFY_TEMPLATE_ID — UUID of template in GC Notify (must exist there)
 *   DEMO_NAME             — Value for {{name}} personalisation
 *   DEMO_EMAIL            — Recipient email address
 *   DEMO_SENDER_EMAIL     — Verified CHES sender address (used for email_reply_to_id)
 *   DEMO_SUBJECT          — Value for {{subject}} (default: "Hello", mirrors GC Notify)
 *
 * For CHES: backend must have CHES_CLIENT_ID, CHES_CLIENT_SECRET in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import Handlebars from 'handlebars';

// Load env — defaults to test/e2e/env.local; override with DEMO_ENV_FILE
const envFile =
  process.env.DEMO_ENV_FILE || resolve(__dirname, '../../test/e2e/env.local');
config({ path: envFile, quiet: true });

const localFile =
  process.env.DEMO_LOCAL_ENV_FILE || resolve(__dirname, '../../.env.local');
config({ path: localFile, quiet: true });

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.E2E_API_KEY || process.env.API_KEY || '';
const gcNotifyApiKey = process.env.GC_NOTIFY_API_KEY || '';
const gcNotifyTemplateId = process.env.GC_NOTIFY_TEMPLATE_ID || '';
const demoName = process.env.DEMO_NAME || '';
const demoEmail = process.env.DEMO_EMAIL || '';
const demoSenderEmail = process.env.DEMO_SENDER_EMAIL || '';
const demoSubject = process.env.DEMO_SUBJECT || 'Hello';

const gcNotify = (path: string) => `${baseUrl}/gc-notify/v2${path}`;

function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `ApiKey-v1 ${apiKey}` };
}

// ─── Handlebars template (matches GC Notify content) ────────────────────────
// heading 1 = This is a greeting
// heading 2 = Personalised for you
// paragraph = Hello {{name}}

const HANDLEBARS_TEMPLATE_HTML = `
<h1>This is a greeting</h1>
<h2>Personalised for you</h2>
<p>Hello {{name}}</p>
`.trim();

// Subject uses {{subject}} so it's substituted via Handlebars (mirrors GC Notify "Hello")
const HANDLEBARS_SUBJECT_TEMPLATE = '{{subject}}';

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

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  header('Dual Transport Demo — CHES + GC Notify');

  // Parse CLI args (override env)
  const args = process.argv.slice(2);
  let name = demoName;
  let email = demoEmail;
  let senderEmail = demoSenderEmail;
  let subject = demoSubject;
  let templateId = gcNotifyTemplateId;
  let gcKey = gcNotifyApiKey;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--email' && args[i + 1]) {
      email = args[++i];
    } else if (args[i] === '--sender-email' && args[i + 1]) {
      senderEmail = args[++i];
    } else if (args[i] === '--subject' && args[i + 1]) {
      subject = args[++i];
    } else if (args[i] === '--template-id' && args[i + 1]) {
      templateId = args[++i];
    } else if (args[i] === '--gc-notify-api-key' && args[i + 1]) {
      gcKey = args[++i];
    }
  }

  console.log(`${C.dim}Target: ${baseUrl}${C.reset}`);
  console.log(`${C.dim}Recipient: ${email || '(not set)'}${C.reset}`);
  console.log(`${C.dim}Sender (CHES): ${senderEmail || '(not set)'}${C.reset}`);
  console.log(`${C.dim}Personalisation name: ${name || '(not set)'}${C.reset}`);
  console.log(
    `${C.dim}GC Notify template ID: ${templateId || '(not set)'}${C.reset}\n`,
  );

  if (!apiKey) {
    fail(
      'E2E_API_KEY (or API_KEY) is required. Set it in test/e2e/env.local or backend/.env.local.',
    );
    process.exit(1);
  }

  if (!gcKey) {
    fail(
      'GC_NOTIFY_API_KEY is required for facade mode. Set it in env or pass --gc-notify-api-key.',
    );
    process.exit(1);
  }

  if (!templateId) {
    fail(
      'GC_NOTIFY_TEMPLATE_ID is required. The template must exist in GC Notify. Set it in env or pass --template-id.',
    );
    process.exit(1);
  }

  if (!name) {
    fail('DEMO_NAME (or --name) is required for personalisation.');
    process.exit(1);
  }

  if (!email) {
    fail('DEMO_EMAIL (or --email) is required for the recipient.');
    process.exit(1);
  }

  if (!senderEmail) {
    fail(
      'DEMO_SENDER_EMAIL (or --sender-email) is required for CHES. Must be a verified CHES sender address.',
    );
    process.exit(1);
  }

  const reference = `dual-demo-${Date.now()}`;
  const personalisation = { name, subject };

  try {
    // ─── Step 1: Create sender for CHES ─────────────────────────────────────
    step(1, 'Create sender identity for CHES');
    sub('POST /gc-notify/v2/senders');
    sub(
      'We register a verified CHES email address. Its UUID is used as email_reply_to_id.',
    );

    const createSenderRes = await fetch(gcNotify('/senders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        type: 'email',
        email_address: senderEmail,
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
    };

    ok(`Sender created: ${sender.email_address} (id: ${sender.id})`);
    json({ id: sender.id, email_address: sender.email_address });
    divider();

    // ─── Step 2: Create local template for CHES ──────────────────────────────
    step(2, 'Create Handlebars template for CHES');
    sub('POST /gc-notify/v2/templates');
    sub(
      'We create a local template with the same content as GC Notify. CHES will use this.',
    );

    const createTemplateRes = await fetch(gcNotify('/templates'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: `Dual Transport Demo ${reference}`,
        type: 'email',
        subject: HANDLEBARS_SUBJECT_TEMPLATE,
        body: HANDLEBARS_TEMPLATE_HTML,
        personalisation: { name: 'string', subject: 'string' },
        active: true,
        engine: 'handlebars',
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

    ok(`Template created for CHES: "${template.name}" (id: ${template.id})`);
    json({
      id: template.id,
      subject: template.subject,
      engine: 'handlebars',
    });
    divider();

    // ─── Step 3: Send via CHES ──────────────────────────────────────────────
    step(3, 'Send email via CHES transport');
    sub('POST /gc-notify/v2/notifications/email');
    sub('Header: X-Delivery-Email-Adapter: ches');
    sub(
      'Backend uses sender UUID (email_reply_to_id), local template, sends via CHES API.',
    );

    const chesRes = await fetch(gcNotify('/notifications/email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Delivery-Email-Adapter': 'ches',
        ...authHeaders(),
      },
      body: JSON.stringify({
        email_address: email,
        template_id: template.id,
        personalisation,
        reference: `${reference}-ches`,
        email_reply_to_id: sender.id,
      }),
    });

    const chesBody = await chesRes.text();
    if (chesRes.status !== 201) {
      fail(`CHES send failed (${chesRes.status}): ${chesBody}`);
      sub(
        'Ensure CHES_CLIENT_ID, CHES_CLIENT_SECRET, CHES_BASE_URL, CHES_TOKEN_URL are set in backend/.env.local.',
      );
      process.exit(1);
    }

    const chesNotification = JSON.parse(chesBody) as {
      id?: string;
      reference?: string;
      content?: { from_email?: string; subject?: string; body?: string };
    };

    ok('Email sent via CHES');
    ok(`To: ${email}`);
    ok(`Subject: ${chesNotification.content?.subject}`);
    ok(`Reference: ${chesNotification.reference}`);
    json({
      id: chesNotification.id,
      reference: chesNotification.reference,
    });
    divider();

    // ─── Step 4: Send via GC Notify (facade) ──────────────────────────────────
    step(4, 'Send email via GC Notify (passthrough facade)');
    sub('POST /gc-notify/v2/notifications/email');
    sub('Headers: X-Delivery-Email-Adapter: gc-notify, X-GC-Notify-Api-Key');
    sub(
      'Backend forwards to real api.notification.canada.ca. Template must exist there.',
    );

    const gcRes = await fetch(gcNotify('/notifications/email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Delivery-Email-Adapter': 'gc-notify',
        'X-GC-Notify-Api-Key': gcKey,
        ...authHeaders(),
      },
      body: JSON.stringify({
        email_address: email,
        template_id: templateId,
        personalisation,
        reference: `${reference}-gc-notify`,
      }),
    });

    const gcBody = await gcRes.text();
    if (gcRes.status !== 201) {
      fail(`GC Notify send failed (${gcRes.status}): ${gcBody}`);
      sub(
        'Ensure your template exists in GC Notify and uses {{name}} (Handlebars) or ((name)) (Jinja2) for personalisation.',
      );
      process.exit(1);
    }

    const gcNotification = JSON.parse(gcBody) as {
      id?: string;
      reference?: string;
      content?: { from_email?: string; subject?: string; body?: string };
    };

    ok('Email sent via GC Notify facade');
    ok(`To: ${email}`);
    ok(`Subject: ${gcNotification.content?.subject}`);
    ok(`Reference: ${gcNotification.reference}`);
    json({
      id: gcNotification.id,
      reference: gcNotification.reference,
    });
    divider();

    // ─── Step 5: Show Handlebars template ────────────────────────────────────
    step(5, 'Handlebars template reference');
    sub('The template used for CHES (and equivalent for GC Notify):');

    const compiledSubject = Handlebars.compile(HANDLEBARS_SUBJECT_TEMPLATE)(
      personalisation,
    );
    const compiledBody = Handlebars.compile(HANDLEBARS_TEMPLATE_HTML)(
      personalisation,
    );

    console.log(
      `  ${C.dim}Subject template: ${HANDLEBARS_SUBJECT_TEMPLATE}${C.reset}`,
    );
    console.log(`  ${C.dim}Rendered subject: ${compiledSubject}${C.reset}`);
    console.log(`  ${C.dim}Body template:${C.reset}`);
    console.log(
      `  ${C.dim}${HANDLEBARS_TEMPLATE_HTML.split('\n').join('\n  ')}${C.reset}`,
    );
    console.log(`  ${C.dim}Rendered body (HTML):${C.reset}`);
    console.log(`  ${C.dim}${compiledBody.split('\n').join('\n  ')}${C.reset}`);
    divider();

    // ─── Summary ─────────────────────────────────────────────────────────────
    header('Demo complete');
    console.log(`${C.green}${C.bold}Both transports succeeded.${C.reset}\n`);
    console.log(`${C.dim}What we achieved:${C.reset}`);
    console.log(`  • Created a sender (${senderEmail}) for CHES`);
    console.log(`  • Created a Handlebars template for CHES`);
    console.log(`  • Sent personalised email via CHES to ${email}`);
    console.log(`  • Sent personalised email via GC Notify facade to ${email}`);
    console.log(
      `  • Same content: "Hello ${name}" with headings and paragraph`,
    );
    console.log('');
  } catch (err) {
    fail(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}

void main();
