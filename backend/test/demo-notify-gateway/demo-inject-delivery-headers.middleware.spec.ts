import type { Request, Response, NextFunction } from 'express';
import { DemoInjectDeliveryHeadersMiddleware } from '../../src/demo-notify-gateway/demo-inject-delivery-headers.middleware';

const envSnapshot = { ...process.env };

describe('DemoInjectDeliveryHeadersMiddleware', () => {
  let middleware: DemoInjectDeliveryHeadersMiddleware;
  let next: NextFunction;

  beforeEach(() => {
    process.env = { ...envSnapshot };
    delete process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED;
    delete process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID;
    delete process.env.DEMO_NOTIFY_EMAIL_ADAPTER;
    delete process.env.DEMO_NOTIFY_GATEWAY_HEADER;
    middleware = new DemoInjectDeliveryHeadersMiddleware();
    next = jest.fn();
  });

  afterAll(() => {
    process.env = { ...envSnapshot };
  });

  function req(
    overrides: Partial<Pick<Request, 'method' | 'path' | 'headers'>>,
  ): Request {
    return {
      method: 'POST',
      path: '/api/v1/notify',
      headers: {},
      ...overrides,
    } as Request;
  }

  it('does nothing when demo auth disabled', () => {
    const r = req({
      headers: { 'x-consumer-custom-id': 'demo-client' },
    });
    middleware.use(r, {} as Response, next);
    expect(r.headers['x-delivery-email-adapter']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('injects email adapter when Kong client and path match', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'true';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';
    process.env.DEMO_NOTIFY_EMAIL_ADAPTER = 'nodemailer';

    const r = req({
      headers: { 'x-consumer-custom-id': 'demo-client' },
    });
    middleware.use(r, {} as Response, next);

    expect(r.headers['x-delivery-email-adapter']).toBe('nodemailer');
    expect(next).toHaveBeenCalled();
  });

  it('does not override existing X-Delivery-Email-Adapter', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'true';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';
    process.env.DEMO_NOTIFY_EMAIL_ADAPTER = 'nodemailer';

    const r = req({
      headers: {
        'x-consumer-custom-id': 'demo-client',
        'x-delivery-email-adapter': 'ches',
      },
    });
    middleware.use(r, {} as Response, next);

    expect(r.headers['x-delivery-email-adapter']).toBe('ches');
  });

  it('skips when Kong id mismatch', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'true';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';
    process.env.DEMO_NOTIFY_EMAIL_ADAPTER = 'nodemailer';

    const r = req({
      headers: { 'x-consumer-custom-id': 'other' },
    });
    middleware.use(r, {} as Response, next);

    expect(r.headers['x-delivery-email-adapter']).toBeUndefined();
  });
});
