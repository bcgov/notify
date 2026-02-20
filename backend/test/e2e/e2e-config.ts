/**
 * E2E integration test configuration.
 * Loaded from env (E2E_ENV_FILE or env.local, then E2E_LOCAL_ENV_FILE or backend/.env.local).
 */
export const e2eConfig = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.E2E_API_KEY || '',
  mailpitUrl: process.env.E2E_MAILPIT_URL,
  /** Skip delivery validation (use for staging with real SMTP). */
  skipDeliveryValidation:
    process.env.E2E_SKIP_DELIVERY_VALIDATION === 'true' ||
    process.env.E2E_SKIP_DELIVERY_VALIDATION === '1',
  /** Delivery validator: "mailpit" | "none". Default: "mailpit" when E2E_MAILPIT_URL set, else "none". */
  deliveryValidator:
    (process.env.E2E_DELIVERY_VALIDATOR as 'mailpit' | 'none') || undefined,
};

/** Whether to run Mailpit-based delivery validation in the full flow test. */
export function shouldValidateDeliveryViaMailpit(): boolean {
  if (e2eConfig.skipDeliveryValidation) return false;
  if (e2eConfig.deliveryValidator === 'none') return false;
  if (e2eConfig.deliveryValidator === 'mailpit') return !!e2eConfig.mailpitUrl;
  return !!e2eConfig.mailpitUrl; // default: use Mailpit when URL is set
}

export function authHeaders(): Record<string, string> {
  if (!e2eConfig.apiKey) {
    return {};
  }
  return {
    Authorization: `ApiKey-v1 ${e2eConfig.apiKey}`,
  };
}
