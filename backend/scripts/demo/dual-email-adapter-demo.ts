#!/usr/bin/env npx ts-node
/**
 * Dual Email Adapter Demo — Nodemailer + CHES via Universal API
 *
 * Sends the same personalised email via two adapters using the universal API:
 * 1. Nodemailer — via SMTP (e.g. Mailpit on port 1025)
 * 2. CHES (Common Hosted Email Service) — via CHES API
 *
 * Template content (Handlebars):
 *   <h1>This is a greeting</h1>
 *   <h2>Personalised for you</h2>
 *   <p>Hello {{name}}</p>
 *   <p>Sent via {{channel}}</p>
 *   channel: nodemailer | ches (per send)
 *
 * Run in devcontainer against local services:
 *   npm run demo:dual-email-adapter
 *
 * Required env (or CLI args):
 *   DEMO_NAME         — Value for {{name}} personalisation
 *   DEMO_EMAIL        — Recipient email address
 *   DEMO_SENDER_EMAIL — Verified CHES sender address (used as default sender)
 *   DEMO_SUBJECT      — Value for {{subject}} (default: "Hello")
 *
 * For CHES: backend must have CHES_CLIENT_ID, CHES_CLIENT_SECRET in .env.local
 * For Nodemailer: Mailpit on port 1025 or NODEMAILER_HOST/PORT in .env.local
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
const demoName = process.env.DEMO_NAME || '';
const demoEmail = process.env.DEMO_EMAIL || '';
const demoSenderEmail = process.env.DEMO_SENDER_EMAIL || '';
const demoSubject = process.env.DEMO_SUBJECT || 'Hello';

const apiV1 = (path: string) => `${baseUrl}/api/v1${path}`;

function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `ApiKey-v1 ${apiKey}` };
}

// ─── Handlebars template ────────────────────────────────────────────────────
const HANDLEBARS_TEMPLATE_HTML = `
<h1>This is a greeting</h1>
<h2>Personalised for you</h2>
<p>Hello {{name}}</p>
<p>Sent via {{channel}}</p>
`.trim();

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

function fail(text: string): void {
  console.log(`  ${C.red}✗ ${text}${C.reset}`);
}

function warn(text: string): void {
  console.log(`  ${C.yellow}⚠ ${text}${C.reset}`);
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
  header('Dual Email Adapter Demo — Nodemailer + CHES (Universal API)');

  // Parse CLI args (override env)
  const args = process.argv.slice(2);
  let name = demoName;
  let email = demoEmail;
  let senderEmail = demoSenderEmail;
  let subject = demoSubject;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--email' && args[i + 1]) {
      email = args[++i];
    } else if (args[i] === '--sender-email' && args[i + 1]) {
      senderEmail = args[++i];
    } else if (args[i] === '--subject' && args[i + 1]) {
      subject = args[++i];
    }
  }

  console.log(`${C.dim}Target: ${baseUrl}${C.reset}`);
  console.log(`${C.dim}Recipient: ${email || '(not set)'}${C.reset}`);
  console.log(
    `${C.dim}Sender (default): ${senderEmail || '(not set)'}${C.reset}`,
  );
  console.log(
    `${C.dim}Personalisation name: ${name || '(not set)'}${C.reset}\n`,
  );

  if (!apiKey) {
    warn('E2E_API_KEY (or API_KEY) not set. Requests may fail.');
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

  const reference = `dual-email-adapter-demo-${Date.now()}`;
  const notifyTypeCode = `single-email-${reference}`;
  let identity: { id?: string; emailAddress?: string } | null = null;
  let template: { id?: string; name?: string; subject?: string } | null = null;
  let nodemailerSucceeded = false;
  let chesSucceeded = false;

  try {
    // ─── Step 1: Create identity (default for from address) ─────────────────────
    step(1, 'Create identity');
    sub('POST /api/v1/identities');
    sub('We register a verified CHES email address as the default sender.');

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

    // ─── Step 2: Create notifyType and template ─────────────────────────────────
    step(2, 'Create notifyType and Handlebars template');
    sub('POST /api/v1/notifyTypes, POST /api/v1/templates');

    try {
      const createNotifyTypeRes = await fetch(apiV1('/notifyTypes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ code: notifyTypeCode, sendAs: 'email' }),
      });
      if (createNotifyTypeRes.status !== 201) {
        const body = await createNotifyTypeRes.text();
        fail(`NotifyType failed (${createNotifyTypeRes.status}): ${body}`);
      } else {
        ok(`NotifyType "${notifyTypeCode}" created`);
      }

      const createTemplateRes = await fetch(apiV1('/templates'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: `Dual Email Adapter Demo ${reference}`,
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
        ok(`Template created: "${template.name}" (id: ${template.id})`);
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

    // ─── Step 3: Send via Nodemailer ────────────────────────────────────────
    step(3, 'Send email via Nodemailer (Notify API)');
    sub('POST /api/v1/notify');
    sub('Header: X-Delivery-Email-Adapter: nodemailer');

    if (template?.id) {
      try {
        const nodemailerRes = await fetch(apiV1('/notify'), {
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
                to: [email],
                templateId: template.id,
                params: { name, subject, channel: 'nodemailer' },
                sendAs: 'email',
              },
              email: identity?.id
                ? { emailIdentityId: identity.id }
                : undefined,
            },
          }),
        });

        const nodemailerBody = await nodemailerRes.text();
        if (nodemailerRes.status !== 201) {
          fail(
            `Nodemailer send failed (${nodemailerRes.status}): ${nodemailerBody}`,
          );
          sub(
            'Ensure Mailpit (or SMTP) is running. NODEMAILER_HOST, NODEMAILER_PORT in backend/.env.local.',
          );
        } else {
          const nodemailerNotification = JSON.parse(nodemailerBody) as {
            notifyId?: string;
            txId?: string;
            messages?: Array<{ msgId: string; to: string[] }>;
          };
          nodemailerSucceeded = true;
          ok('Email sent via Nodemailer');
          ok(`To: ${email}`);
          json({
            notifyId: nodemailerNotification.notifyId,
            txId: nodemailerNotification.txId,
          });
        }
      } catch (err) {
        fail(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      fail('Skipped: template required (from step 2).');
    }
    divider();

    // ─── Step 4: Send via CHES ──────────────────────────────────────────────
    step(4, 'Send email via CHES (Notify API)');
    sub('POST /api/v1/notify');
    sub('Header: X-Delivery-Email-Adapter: ches');

    if (template?.id) {
      try {
        const chesRes = await fetch(apiV1('/notify'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Delivery-Email-Adapter': 'ches',
            ...authHeaders(),
          },
          body: JSON.stringify({
            notifyType: notifyTypeCode,
            override: {
              common: {
                to: [email],
                templateId: template.id,
                params: { name, subject, channel: 'ches' },
                sendAs: 'email',
              },
              email: identity?.id
                ? { emailIdentityId: identity.id }
                : undefined,
            },
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
            notifyId?: string;
            txId?: string;
          };
          chesSucceeded = true;
          ok('Email sent via CHES');
          ok(`To: ${email}`);
          json({
            notifyId: chesNotification.notifyId,
            txId: chesNotification.txId,
          });
        }
      } catch (err) {
        fail(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      fail('Skipped: template required (from step 2).');
    }
    divider();

    // ─── Step 5: Show Handlebars template ────────────────────────────────────
    step(5, 'Handlebars template reference');
    sub('The template used for both adapters:');

    const compiledSubject = Handlebars.compile(HANDLEBARS_SUBJECT_TEMPLATE)({
      name,
      subject,
      channel: 'nodemailer',
    });
    const compiledBody = Handlebars.compile(HANDLEBARS_TEMPLATE_HTML)({
      name,
      subject,
      channel: 'nodemailer',
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
    if (nodemailerSucceeded && chesSucceeded) {
      console.log(`${C.green}${C.bold}Both adapters succeeded.${C.reset}\n`);
    } else if (nodemailerSucceeded || chesSucceeded) {
      console.log(
        `${C.yellow}${C.bold}Partial success.${C.reset} Nodemailer: ${nodemailerSucceeded ? 'ok' : 'failed'}, CHES: ${chesSucceeded ? 'ok' : 'failed'}\n`,
      );
    } else {
      console.log(`${C.red}${C.bold}No sends succeeded.${C.reset}\n`);
    }
    console.log(`${C.dim}What we achieved:${C.reset}`);
    console.log(`  • Identity: ${identity ? 'created' : 'failed/skipped'}`);
    console.log(`  • Template: ${template ? 'created' : 'failed/skipped'}`);
    console.log(
      `  • Nodemailer send: ${nodemailerSucceeded ? 'ok' : 'failed/skipped'}`,
    );
    console.log(`  • CHES send: ${chesSucceeded ? 'ok' : 'failed/skipped'}`);
    console.log(`  • All via Notify API: POST /api/v1/notify`);
    console.log('');
  } catch (err) {
    fail(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

void main();
