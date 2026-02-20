#!/usr/bin/env npx ts-node
/**
 * Dual Transport Demo — CHES + GC Notify
 *
 * Sends the same personalised email via two transports:
 * 1. CHES (Common Hosted Email Service) — via local backend template + CHES API
 * 2. GC Notify (passthrough) — forwards to real api.notification.canada.ca
 *
 * Template content (Handlebars):
 *   <h1>This is a greeting</h1>
 *   <h2>Personalised for you</h2>
 *   <p>Hello {{name}}</p>
 *   <p>Sent via {{channel}}</p>
 *   channel: gc-notify-ches | gc-notify-passthrough (per send)
 *
 * Run in devcontainer against local services:
 *   npm run demo:dual-transport
 *
 * Required env (or CLI args):
 *   GC_NOTIFY_API_KEY     — Your GC Notify API key (for passthrough)
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

const apiV1 = (path: string) => `${baseUrl}/api/v1${path}`;
const gcNotify = (path: string) => `${baseUrl}/api/v1/gcnotify${path}`;

function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `ApiKey-v1 ${apiKey}` };
}

// ─── Handlebars template (matches GC Notify content) ────────────────────────
// heading 1 = This is a greeting
// heading 2 = Personalised for you
// paragraph = Hello {{name}}
// channel = gc-notify-ches | gc-notify-passthrough (populated per send)

const HANDLEBARS_TEMPLATE_HTML = `
<h1>This is a greeting</h1>
<h2>Personalised for you</h2>
<p>Hello {{name}}</p>
<p>Sent via {{channel}}</p>
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
    warn('E2E_API_KEY (or API_KEY) not set. Requests may fail.');
  }
  if (!gcKey) {
    warn('GC_NOTIFY_API_KEY not set. Facade step will be skipped.');
  }
  if (!templateId) {
    warn('GC_NOTIFY_TEMPLATE_ID not set. Facade step will be skipped.');
  }
  if (!name) {
    warn('DEMO_NAME (or --name) not set. Using placeholder.');
  }
  if (!email) {
    warn('DEMO_EMAIL (or --email) not set. Send steps will fail.');
  }
  if (!senderEmail) {
    warn('DEMO_SENDER_EMAIL (or --sender-email) not set. CHES step may fail.');
  }

  const reference = `dual-demo-${Date.now()}`;
  let identity: { id?: string; emailAddress?: string } | null = null;
  let template: { id?: string; name?: string; subject?: string } | null = null;
  let chesSucceeded = false;
  let gcSucceeded = false;

  try {
    // ─── Step 1: Create identity for CHES ─────────────────────────────────────
    step(1, 'Create identity for CHES');
    sub('POST /api/v1/identities');
    sub(
      'We register a verified CHES email address. Its UUID is used as email_reply_to_id.',
    );

    try {
      const createIdentityRes = await fetch(apiV1('/identities'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          type: 'email',
          emailAddress: senderEmail,
          isDefault: true,
        }),
      });

      if (createIdentityRes.status !== 201) {
        const body = await createIdentityRes.text();
        fail(`Request failed (${createIdentityRes.status}): ${body}`);
      } else {
        identity = (await createIdentityRes.json()) as {
          id?: string;
          emailAddress?: string;
        };
        ok(`Identity created: ${identity.emailAddress} (id: ${identity.id})`);
        json({ id: identity.id, emailAddress: identity.emailAddress });
      }
    } catch (err) {
      fail(
        `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    divider();

    // ─── Step 2: Create local template for CHES ──────────────────────────────
    step(2, 'Create Handlebars template for CHES');
    sub('POST /api/v1/templates');
    sub(
      'We create a local template with the same content as GC Notify. CHES will use this.',
    );

    try {
      const createTemplateRes = await fetch(apiV1('/templates'), {
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
          personalisation: {
            name: 'string',
            subject: 'string',
            channel: 'string',
          },
          active: true,
          engine: 'handlebars',
        }),
      });

      if (createTemplateRes.status !== 201) {
        const body = await createTemplateRes.text();
        fail(`Request failed (${createTemplateRes.status}): ${body}`);
      } else {
        template = (await createTemplateRes.json()) as {
          id?: string;
          name?: string;
          subject?: string;
        };
        ok(
          `Template created for CHES: "${template.name}" (id: ${template.id})`,
        );
        json({
          id: template.id,
          subject: template.subject,
          engine: 'handlebars',
        });
      }
    } catch (err) {
      fail(
        `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    divider();

    // ─── Step 3: Send via CHES ──────────────────────────────────────────────
    step(3, 'Send email via CHES transport');
    sub('POST /api/v1/gcnotify/notifications/email');
    sub('Header: X-Delivery-Email-Adapter: ches');
    sub(
      'Backend uses sender UUID (email_reply_to_id), local template, sends via CHES API.',
    );

    if (identity?.id && template?.id) {
      try {
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
            personalisation: { name, subject, channel: 'gc-notify-ches' },
            reference: `${reference}-ches`,
            email_reply_to_id: identity.id,
          }),
        });

        const chesBody = await chesRes.text();
        if (chesRes.status !== 201) {
          fail(`CHES send failed (${chesRes.status}): ${chesBody}`);
          sub(
            'Ensure CHES_CLIENT_ID, CHES_CLIENT_SECRET, CHES_BASE_URL, CHES_TOKEN_URL are set in backend/.env.local.',
          );
        } else {
          const chesNotification = JSON.parse(chesBody) as {
            id?: string;
            reference?: string;
            content?: { from_email?: string; subject?: string; body?: string };
          };
          chesSucceeded = true;
          ok('Email sent via CHES');
          ok(`To: ${email}`);
          ok(`Subject: ${chesNotification.content?.subject}`);
          ok(`Reference: ${chesNotification.reference}`);
          json({
            id: chesNotification.id,
            reference: chesNotification.reference,
          });
        }
      } catch (err) {
        fail(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      fail('Skipped: identity and template required (from steps 1–2).');
    }
    divider();

    // ─── Step 4: Send via GC Notify (passthrough) ──────────────────────────────
    step(4, 'Send email via GC Notify (passthrough)');
    sub('POST /api/v1/gcnotify/notifications/email');
    sub(
      'Headers: X-Delivery-Email-Adapter: gc-notify:passthrough, X-GC-Notify-Api-Key',
    );
    sub(
      'Backend forwards to real api.notification.canada.ca. Template must exist there.',
    );

    if (gcKey && templateId) {
      try {
        const gcRes = await fetch(gcNotify('/notifications/email'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Delivery-Email-Adapter': 'gc-notify:passthrough',
            'X-GC-Notify-Api-Key': gcKey,
            ...authHeaders(),
          },
          body: JSON.stringify({
            email_address: email,
            template_id: templateId,
            personalisation: {
              name,
              subject,
              channel: 'gc-notify-passthrough',
            },
            reference: `${reference}-gc-notify`,
          }),
        });

        const gcBody = await gcRes.text();
        if (gcRes.status !== 201) {
          fail(`GC Notify send failed (${gcRes.status}): ${gcBody}`);
          sub(
            'Ensure your template exists in GC Notify and uses {{name}} (Handlebars) or ((name)) (Jinja2) for personalisation.',
          );
        } else {
          const gcNotification = JSON.parse(gcBody) as {
            id?: string;
            reference?: string;
            content?: { from_email?: string; subject?: string; body?: string };
          };
          gcSucceeded = true;
          ok('Email sent via GC Notify passthrough');
          ok(`To: ${email}`);
          ok(`Subject: ${gcNotification.content?.subject}`);
          ok(`Reference: ${gcNotification.reference}`);
          json({
            id: gcNotification.id,
            reference: gcNotification.reference,
          });
        }
      } catch (err) {
        fail(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      fail('Skipped: GC_NOTIFY_API_KEY and GC_NOTIFY_TEMPLATE_ID required.');
    }
    divider();

    // ─── Step 5: Show Handlebars template ────────────────────────────────────
    step(5, 'Handlebars template reference');
    sub('The template used for CHES (and equivalent for GC Notify):');

    const compiledSubject = Handlebars.compile(HANDLEBARS_SUBJECT_TEMPLATE)({
      name,
      subject,
      channel: 'gc-notify-ches',
    });
    const compiledBody = Handlebars.compile(HANDLEBARS_TEMPLATE_HTML)({
      name,
      subject,
      channel: 'gc-notify-ches',
    });

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
    if (chesSucceeded && gcSucceeded) {
      console.log(`${C.green}${C.bold}Both transports succeeded.${C.reset}\n`);
    } else if (chesSucceeded || gcSucceeded) {
      console.log(
        `${C.yellow}${C.bold}Partial success.${C.reset} CHES: ${chesSucceeded ? 'ok' : 'failed'}, GC Notify: ${gcSucceeded ? 'ok' : 'failed'}\n`,
      );
    } else {
      console.log(`${C.red}${C.bold}No sends succeeded.${C.reset}\n`);
    }
    console.log(`${C.dim}What we achieved:${C.reset}`);
    console.log(`  • Identity: ${identity ? 'created' : 'failed/skipped'}`);
    console.log(`  • Template: ${template ? 'created' : 'failed/skipped'}`);
    console.log(`  • CHES send: ${chesSucceeded ? 'ok' : 'failed/skipped'}`);
    console.log(
      `  • GC Notify passthrough send: ${gcSucceeded ? 'ok' : 'failed/skipped'}`,
    );
    console.log('');
  } catch (err) {
    fail(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

void main();
