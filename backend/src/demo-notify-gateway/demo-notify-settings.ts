/** Env-driven settings for Kong demo auth + delivery header injection. */

export function isDemoNotifyGatewayAuthEnabled(): boolean {
  const v = process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED?.trim().toLowerCase();
  return v === 'true' || v === '1';
}

export function getDemoNotifyGatewayClientHeaderName(): string {
  const fromDemo = process.env.DEMO_NOTIFY_GATEWAY_HEADER?.trim();
  if (fromDemo) {
    return fromDemo.toLowerCase();
  }
  const fromAuth = process.env.AUTH_GATEWAY_SERVICE_CLIENT_ID_HEADER?.trim();
  if (fromAuth) {
    return fromAuth.toLowerCase();
  }
  return 'x-consumer-custom-id';
}

export function getDemoNotifyGatewayClientId(): string | undefined {
  const v = process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID?.trim();
  return v || undefined;
}

export function getDemoNotifyWorkspaceId(): string {
  return process.env.DEMO_NOTIFY_WORKSPACE_ID?.trim() || 'default';
}

export function getDemoNotifySenderEmail(): string | undefined {
  const v = process.env.DEMO_NOTIFY_SENDER_EMAIL?.trim();
  return v || undefined;
}

export function getDemoNotifyEmailAdapter(): string | undefined {
  const v = process.env.DEMO_NOTIFY_EMAIL_ADAPTER?.trim().toLowerCase();
  return v || undefined;
}

export function getDemoNotifySmsAdapter(): string | undefined {
  const v = process.env.DEMO_NOTIFY_SMS_ADAPTER?.trim().toLowerCase();
  return v || undefined;
}

const VALID_EMAIL_KEYS = new Set([
  'nodemailer',
  'ches',
  'gc-notify:passthrough',
  'ches:passthrough',
]);
const VALID_SMS_KEYS = new Set(['twilio', 'gc-notify:passthrough']);

export function isValidDemoEmailAdapterKey(key: string): boolean {
  return VALID_EMAIL_KEYS.has(key);
}

export function isValidDemoSmsAdapterKey(key: string): boolean {
  return VALID_SMS_KEYS.has(key);
}

/** Entries like POST:/api/v1/notify */
export function getDemoNotifyAuthPathRules(): Array<{
  method: string;
  path: string;
}> {
  const raw =
    process.env.DEMO_NOTIFY_AUTH_PATHS?.trim() || 'POST:/api/v1/notify';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf(':');
      if (idx <= 0) {
        return { method: '', path: '' };
      }
      const method = entry.slice(0, idx).trim().toUpperCase();
      const path = entry.slice(idx + 1).trim();
      return { method, path };
    })
    .filter((r) => r.method && r.path);
}

/** Path candidates for matching (Express may set path vs originalUrl differently under Nest). */
export function getDemoRequestPathCandidates(req: {
  path?: string;
  originalUrl?: string;
  url?: string;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string | undefined) => {
    if (!s) return;
    const norm = s.split('?')[0] || s;
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push(norm);
  };
  push(req.path);
  push(req.originalUrl);
  push(req.url);
  return out;
}

export function requestMatchesDemoRequest(req: {
  method?: string;
  path?: string;
  originalUrl?: string;
  url?: string;
}): boolean {
  const m = (req.method ?? 'GET').toUpperCase();
  const candidates = getDemoRequestPathCandidates(req);
  const rules = getDemoNotifyAuthPathRules();
  return rules.some(
    (r) =>
      r.method === m && candidates.some((candidate) => candidate === r.path),
  );
}
