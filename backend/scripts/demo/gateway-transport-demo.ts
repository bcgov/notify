#!/usr/bin/env npx ts-node
/**
 * Gateway Transport Demo — CHES + GC Notify (gateway auth)
 *
 * Same flow as dual-transport-demo but authenticates via gateway service client:
 * sends the gateway client-id header (e.g. x-consumer-custom-id) instead of
 * ApiKey-v1. Backend must load workspace/service-client data from bootstrap JSON
 * (AUTH_BOOTSTRAP_PATH=config/workspace-auth.bootstrap.example.json) and have
 * gateway-service-client in AUTH_STRATEGIES.
 *
 * Sends the same personalised email via:
 * 1. CHES — local template + CHES API
 * 2. GC Notify (passthrough) — optional, if GC_NOTIFY_API_KEY + template id set
 *
 * Run:
 *   npm run demo:gateway-transport
 *
 * Required env (or CLI):
 *   DEMO_GATEWAY_CLIENT_ID     — Service client id from bootstrap JSON (e.g. LOCAL-JOHN-CLIENT)
 *   DEMO_GATEWAY_CLIENT_ID_HEADER — Header name (default: x-consumer-custom-id; or use AUTH_GATEWAY_SERVICE_CLIENT_ID_HEADER)
 *   DEMO_SENDER_EMAIL          — For Step 1 identity (CHES)
 *   DEMO_EMAIL                 — Recipient (sends)
 *   DEMO_NAME, DEMO_SUBJECT    — Personalisation
 *   GC_NOTIFY_API_KEY, GC_NOTIFY_TEMPLATE_ID — Optional, for Step 4 passthrough
 *
 * Backend: AUTH_BOOTSTRAP_PATH, AUTH_GATEWAY_SERVICE_CLIENT_ID_HEADER, AUTH_STRATEGIES=gateway-service-client,...
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import Handlebars from 'handlebars';

const envFile =
  process.env.DEMO_ENV_FILE || resolve(__dirname, '../../test/e2e/env.local');
config({ path: envFile, quiet: true });

const localFile =
  process.env.DEMO_LOCAL_ENV_FILE || resolve(__dirname, '../../.env.local');
config({ path: localFile, quiet: true });

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
const gatewayClientIdHeader =
  process.env.DEMO_GATEWAY_CLIENT_ID_HEADER ||
  process.env.AUTH_GATEWAY_SERVICE_CLIENT_ID_HEADER ||
  'x-consumer-custom-id';
const gatewayClientId =
  process.env.DEMO_GATEWAY_CLIENT_ID || 'LOCAL-JOHN-CLIENT';
const gcNotifyApiKey = process.env.GC_NOTIFY_API_KEY || '';
const gcNotifyTemplateId = process.env.GC_NOTIFY_TEMPLATE_ID || '';
const demoName = process.env.DEMO_NAME || '';
const demoEmail = process.env.DEMO_EMAIL || '';
const demoSenderEmail = process.env.DEMO_SENDER_EMAIL || '';
const demoSubject = process.env.DEMO_SUBJECT || 'Hello';

const apiV1 = (path: string) => `${baseUrl}/api/v1${path}`;
const gcNotify = (path: string) => `${baseUrl}/api/v1/gcnotify${path}`;

const HANDLEBARS_TEMPLATE_HTML = `
<h1>This is a greeting</h1>
<h2>Personalised for you</h2>
<p>Hello {{name}}</p>
<p>Sent via {{channel}}</p>
`.trim();

const HANDLEBARS_SUBJECT_TEMPLATE = '{{subject}}';

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

async function main(): Promise<void> {
  header('Gateway Transport Demo — CHES + GC Notify (gateway auth)');

  const args = process.argv.slice(2);
  let name = demoName;
  let email = demoEmail;
  let senderEmail = demoSenderEmail;
  let subject = demoSubject;
  let templateId = gcNotifyTemplateId;
  let gcKey = gcNotifyApiKey;
  let clientId = gatewayClientId;
  let clientIdHeaderName = gatewayClientIdHeader;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) name = args[++i];
    else if (args[i] === '--email' && args[i + 1]) email = args[++i];
    else if (args[i] === '--sender-email' && args[i + 1])
      senderEmail = args[++i];
    else if (args[i] === '--subject' && args[i + 1]) subject = args[++i];
    else if (args[i] === '--template-id' && args[i + 1]) templateId = args[++i];
    else if (args[i] === '--gc-notify-api-key' && args[i + 1])
      gcKey = args[++i];
    else if (args[i] === '--gateway-client-id' && args[i + 1])
      clientId = args[++i];
    else if (args[i] === '--gateway-header' && args[i + 1])
      clientIdHeaderName = args[++i];
  }

  function gatewayAuthHeaders(): Record<string, string> {
    if (!clientId) return {};
    return { [clientIdHeaderName]: clientId };
  }

  console.log(`${C.dim}Target: ${baseUrl}${C.reset}`);
  console.log(
    `${C.dim}Auth: gateway header "${clientIdHeaderName}" = ${clientId}${C.reset}`,
  );
  console.log(`${C.dim}Recipient: ${email || '(not set)'}${C.reset}`);
  console.log(`${C.dim}Sender (CHES): ${senderEmail || '(not set)'}${C.reset}`);
  console.log(`${C.dim}Personalisation name: ${name || '(not set)'}${C.reset}`);
  console.log(
    `${C.dim}GC Notify template ID: ${templateId || '(not set)'}${C.reset}\n`,
  );

  if (!clientId) {
    warn(
      'DEMO_GATEWAY_CLIENT_ID (or --gateway-client-id) not set. Requests will be unauthenticated.',
    );
  }
  if (!gcKey)
    warn('GC_NOTIFY_API_KEY not set. Step 4 (passthrough) will be skipped.');
  if (!templateId)
    warn('GC_NOTIFY_TEMPLATE_ID not set. Step 4 will be skipped.');
  if (!name) warn('DEMO_NAME (or --name) not set. Using placeholder.');
  if (!email) warn('DEMO_EMAIL (or --email) not set. Send steps will fail.');
  if (!senderEmail)
    warn(
      'DEMO_SENDER_EMAIL (or --sender-email) not set. Step 1 will be skipped.',
    );

  const reference = `gateway-demo-${Date.now()}`;
  let identity: { id?: string; emailAddress?: string } | null = null;
  let template: { id?: string; name?: string; subject?: string } | null = null;
  let chesSucceeded = false;
  let gcSucceeded = false;

  try {
    step(1, 'Create identity for CHES');
    sub('POST /api/v1/identities');
    sub('Verified CHES email; UUID used as email_reply_to_id.');

    if (!senderEmail) {
      fail(
        'Skipped: DEMO_SENDER_EMAIL (or --sender-email) required for identity creation.',
      );
      divider();
    } else {
      try {
        const createIdentityRes = await fetch(apiV1('/identities'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...gatewayAuthHeaders(),
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
    }

    step(2, 'Create Handlebars template for CHES');
    sub('POST /api/v1/templates');

    try {
      const createTemplateRes = await fetch(apiV1('/templates'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...gatewayAuthHeaders(),
        },
        body: JSON.stringify({
          name: `Gateway Transport Demo ${reference}`,
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

    step(3, 'Send email via CHES transport');
    sub('POST /api/v1/gcnotify/notifications/email');
    sub('Header: X-Delivery-Email-Adapter: ches');

    if (identity?.id && template?.id) {
      try {
        const chesRes = await fetch(gcNotify('/notifications/email'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Delivery-Email-Adapter': 'ches',
            ...gatewayAuthHeaders(),
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
        } else {
          const chesNotification = JSON.parse(chesBody) as {
            id?: string;
            reference?: string;
            content?: { subject?: string };
          };
          chesSucceeded = true;
          ok('Email sent via CHES');
          ok(`To: ${email}`);
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

    step(4, 'Send email via GC Notify (passthrough)');
    sub(
      'Headers: X-Delivery-Email-Adapter: gc-notify:passthrough, X-GC-Notify-Api-Key',
    );

    if (gcKey && templateId) {
      try {
        const gcRes = await fetch(gcNotify('/notifications/email'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Delivery-Email-Adapter': 'gc-notify:passthrough',
            'X-GC-Notify-Api-Key': gcKey,
            ...gatewayAuthHeaders(),
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
        } else {
          const gcNotification = JSON.parse(gcBody) as {
            id?: string;
            reference?: string;
            content?: { subject?: string };
          };
          gcSucceeded = true;
          ok('Email sent via GC Notify passthrough');
          ok(`To: ${email}`);
          json({ id: gcNotification.id, reference: gcNotification.reference });
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

    step(5, 'Handlebars template reference');
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
    console.log(`  ${C.dim}Subject: ${compiledSubject}${C.reset}`);
    console.log(
      `  ${C.dim}Body (excerpt): ${compiledBody.slice(0, 80)}...${C.reset}`,
    );
    divider();

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
      `  • GC Notify passthrough: ${gcSucceeded ? 'ok' : 'failed/skipped'}`,
    );
    console.log('');
  } catch (err) {
    fail(
      `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

void main();
