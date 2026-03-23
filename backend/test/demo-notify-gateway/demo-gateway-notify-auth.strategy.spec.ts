import { DemoGatewayNotifyAuthStrategy } from '../../src/demo-notify-gateway/demo-gateway-notify-auth.strategy';

const envSnapshot = { ...process.env };

describe('DemoGatewayNotifyAuthStrategy', () => {
  let strategy: DemoGatewayNotifyAuthStrategy;

  beforeEach(() => {
    process.env = { ...envSnapshot };
    delete process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED;
    delete process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID;
    delete process.env.DEMO_NOTIFY_WORKSPACE_ID;
    delete process.env.DEMO_NOTIFY_AUTH_PATHS;
    delete process.env.DEMO_NOTIFY_GATEWAY_HEADER;
    strategy = new DemoGatewayNotifyAuthStrategy();
  });

  afterAll(() => {
    process.env = { ...envSnapshot };
  });

  it('returns null when demo auth is disabled', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'false';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';
    expect(
      strategy.authenticate({
        method: 'POST',
        path: '/api/v1/notify',
        headers: { 'x-consumer-custom-id': 'demo-client' },
      } as never),
    ).toBeNull();
  });

  it('returns null when path does not match', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'true';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';
    expect(
      strategy.authenticate({
        method: 'GET',
        path: '/api/v1/notify',
        headers: { 'x-consumer-custom-id': 'demo-client' },
      } as never),
    ).toBeNull();
  });

  it('returns null when Kong header does not match', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'true';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';
    expect(
      strategy.authenticate({
        method: 'POST',
        path: '/api/v1/notify',
        headers: { 'x-consumer-custom-id': 'other' },
      } as never),
    ).toBeNull();
  });

  it('returns principal when only originalUrl matches configured path', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'true';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';

    const p = strategy.authenticate({
      method: 'POST',
      path: '/notify',
      originalUrl: '/api/v1/notify',
      headers: { 'x-consumer-custom-id': 'demo-client' },
    } as never);

    expect(p?.workspaceId).toBe('default');
  });

  it('returns principal when path and header match', () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'true';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'demo-client';
    process.env.DEMO_NOTIFY_WORKSPACE_ID = 'ws-demo';

    const p = strategy.authenticate({
      method: 'POST',
      path: '/api/v1/notify',
      headers: { 'x-consumer-custom-id': 'demo-client' },
    } as never);

    expect(p).toEqual({
      type: 'service',
      subjectId: 'demo-notify-gateway:demo-client',
      workspaceId: 'ws-demo',
      workspaceKind: 'local',
      gatewayClientId: 'demo-client',
      authSource: 'demo-gateway-notify',
    });
  });
});
