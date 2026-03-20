#!/usr/bin/env npx ts-node
/**
 * Kong Routes Demo — hit each Kong path as a different client (john, sue, default)
 *
 * Calls the backend through Kong at http://localhost:8000 so each path prefix
 * gets different x-consumer-custom-id headers and the backend resolves a
 * different workspace. Uses GET /api/v1/me (returns current workspace + client) so each path shows
 * different principal data and you see requests in backend logs.
 *
 * Prerequisites:
 *   - Backend running (e.g. npm run start:dev on port 3000)
 *   - Kong sidecar running (docker compose -f .devcontainer/docker-compose.yml up -d)
 *   - AUTH_BOOTSTRAP_PATH pointing at workspace-auth.bootstrap.example.json
 *
 * Run:
 *   npm run demo:kong-routes
 *
 * Env:
 *   KONG_BASE_URL — Kong proxy URL (default: http://localhost:8000)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

const envFile =
  process.env.DEMO_ENV_FILE || resolve(__dirname, '../../test/e2e/env.local');
config({ path: envFile, quiet: true });

const localFile =
  process.env.DEMO_LOCAL_ENV_FILE || resolve(__dirname, '../../.env.local');
config({ path: localFile, quiet: true });

const kongBase = process.env.KONG_BASE_URL || 'http://localhost:8000';

const ROUTES: {
  path: string;
  label: string;
  clientId: string;
  workspace: string;
}[] = [
  {
    path: '/john',
    label: 'John',
    clientId: 'LOCAL-JOHN-CLIENT',
    workspace: 'john',
  },
  {
    path: '/sue',
    label: 'Sue',
    clientId: 'LOCAL-SUE-CLIENT',
    workspace: 'sue',
  },
  {
    path: '/',
    label: 'Default',
    clientId: 'LOCAL-DEFAULT-CLIENT',
    workspace: 'default',
  },
];

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
  const line = '═'.repeat(50);
  console.log(`\n${C.cyan}╔${line}╗${C.reset}`);
  console.log(`${C.cyan}║${C.reset}  ${C.bold}${title}${C.reset}`);
  console.log(`${C.cyan}╚${line}╝${C.reset}\n`);
}

function ok(text: string): void {
  console.log(`  ${C.green}✓ ${text}${C.reset}`);
}

function fail(text: string): void {
  console.log(`  ${C.red}✗ ${text}${C.reset}`);
}

function dim(text: string): void {
  console.log(`  ${C.dim}${text}${C.reset}`);
}

async function main(): Promise<void> {
  header('Kong Routes Demo — each path = different client');

  console.log(`${C.dim}Kong base URL: ${kongBase}${C.reset}`);
  console.log(
    `${C.dim}No auth header: Kong injects x-consumer-custom-id per route.${C.reset}\n`,
  );

  let allOk = true;

  for (const route of ROUTES) {
    const pathLabel = route.path === '/' ? '/' : route.path;
    const url = `${kongBase.replace(/\/$/, '')}${route.path}/api/v1/me`;
    console.log(
      `${C.bold}${C.blue}Route ${pathLabel}${C.reset} (${route.label} → ${route.workspace})`,
    );

    try {
      const res = await fetch(url, { method: 'GET' });
      const body = await res.text();
      if (res.ok) {
        let parsed: {
          workspaceId?: string;
          gatewayClientId?: string;
          authSource?: string;
        };
        try {
          parsed = JSON.parse(body) as typeof parsed;
        } catch {
          parsed = {};
        }
        ok(`GET ${pathLabel}/api/v1/me → ${res.status}`);
        dim(
          `workspaceId: ${parsed.workspaceId ?? '-'}, gatewayClientId: ${parsed.gatewayClientId ?? '-'}, authSource: ${parsed.authSource ?? '-'}`,
        );
        dim(`Response: ${body}`);
      } else {
        fail(
          `GET ${pathLabel}/api/v1/me → ${res.status}: ${body.slice(0, 120)}`,
        );
        allOk = false;
      }
    } catch (err) {
      fail(
        `Request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      allOk = false;
    }
    console.log('');
  }

  header(allOk ? 'Done — all routes OK' : 'Done — some requests failed');
  if (!allOk) {
    console.log(
      `${C.dim}Ensure backend is running (port 3000) and Kong sidecar is up (port 8000).${C.reset}`,
    );
    console.log(
      `${C.dim}Backend logs GET /me for each request when you run the demo.${C.reset}\n`,
    );
    process.exit(1);
  }
  console.log('');
}

void main();
