import { e2eConfig, authHeaders } from './e2e-config';

const { baseUrl, apiKey } = e2eConfig;

interface NotificationResponse {
  id?: string;
  uri?: string;
}

describe('Notifications (integration)', () => {
  it('POST /v1/notifications/email without API key returns 401', async () => {
    const res = await fetch(`${baseUrl}/v1/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        template_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/notifications/sms without API key returns 401', async () => {
    const res = await fetch(`${baseUrl}/v1/notifications/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: '+12505551234',
        template_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /v1/notifications/email returns 201', async () => {
    if (!apiKey) return;

    const res = await fetch(`${baseUrl}/v1/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        to: 'test@example.com',
        template_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as NotificationResponse;
    expect(body.id).toBeDefined();
    expect(body.uri).toMatch(/\/v1\/notifications\//);
  });
});
