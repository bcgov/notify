import { e2eConfig } from './e2e-config';

const { baseUrl } = e2eConfig;

interface HealthBody {
  status?: string;
  service?: string;
  timestamp?: string;
}

describe('Health (integration)', () => {
  it('GET /api/v1/health returns ok', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthBody;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('bc-notify-api');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health/ready returns ready', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health/ready`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthBody;
    expect(body.status).toBe('ready');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health/live returns alive', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health/live`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthBody;
    expect(body.status).toBe('alive');
    expect(body.timestamp).toBeDefined();
  });
});
