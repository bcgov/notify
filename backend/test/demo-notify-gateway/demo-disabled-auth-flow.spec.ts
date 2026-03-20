import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AuthStrategy } from '../../src/common/auth/interfaces/auth-strategy.interface';
import { PrincipalResolver } from '../../src/common/auth/principal-resolver.service';
import { AUTH_STRATEGIES } from '../../src/common/auth/tokens';
import { DemoInjectDeliveryHeadersMiddleware } from '../../src/demo-notify-gateway/demo-inject-delivery-headers.middleware';
import { DemoGatewayNotifyAuthStrategy } from '../../src/demo-notify-gateway/demo-gateway-notify-auth.strategy';

const envSnapshot = { ...process.env };

describe('Demo notify disabled (DEMO_* off)', () => {
  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  async function createResolverWithRealDemo(
    gatewayAuthenticate: AuthStrategy['authenticate'],
    gcAuthenticate: AuthStrategy['authenticate'],
  ): Promise<PrincipalResolver> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrincipalResolver,
        DemoGatewayNotifyAuthStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.strategies') {
                return ['gateway-service-client', 'gc-notify-api-key'];
              }
              return undefined;
            }),
          },
        },
        {
          provide: AUTH_STRATEGIES,
          useFactory: (demo: DemoGatewayNotifyAuthStrategy) => {
            const gatewayStrategy: AuthStrategy = {
              name: 'gateway-service-client',
              authenticate: gatewayAuthenticate,
            };
            const gcStrategy: AuthStrategy = {
              name: 'gc-notify-api-key',
              authenticate: gcAuthenticate,
            };
            return [demo, gatewayStrategy, gcStrategy];
          },
          inject: [DemoGatewayNotifyAuthStrategy],
        },
      ],
    }).compile();

    return module.get(PrincipalResolver);
  }

  it('PrincipalResolver: real demo strategy returns null when env unset; gateway authenticates', async () => {
    delete process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED;
    delete process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID;

    const gatewayMock = jest.fn().mockReturnValue({
      type: 'service',
      subjectId: 'svc-1',
      workspaceId: 'workspace-1',
      authSource: 'gateway-service-client',
    });
    const gcMock = jest.fn().mockReturnValue(null);

    const resolver = await createResolverWithRealDemo(gatewayMock, gcMock);
    const req = {
      method: 'POST',
      path: '/api/v1/notify',
      headers: { 'x-consumer-custom-id': 'any' },
    } as never;

    const principal = resolver.resolveOptional(req);

    expect(principal?.authSource).toBe('gateway-service-client');
    expect(gatewayMock).toHaveBeenCalledWith(req);
    expect(gcMock).not.toHaveBeenCalled();
  });

  it('PrincipalResolver: DEMO_NOTIFY_GATEWAY_AUTH_ENABLED=false falls through to gateway', async () => {
    process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED = 'false';
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'would-match-if-enabled';

    const gatewayMock = jest.fn().mockReturnValue({
      type: 'service',
      subjectId: 'svc-1',
      workspaceId: 'default',
      authSource: 'gateway-service-client',
    });
    const gcMock = jest.fn().mockReturnValue(null);

    const resolver = await createResolverWithRealDemo(gatewayMock, gcMock);
    const req = {
      method: 'POST',
      path: '/api/v1/notify',
      headers: { 'x-consumer-custom-id': 'would-match-if-enabled' },
    } as never;

    expect(resolver.resolveOptional(req)?.authSource).toBe(
      'gateway-service-client',
    );
    expect(gatewayMock).toHaveBeenCalled();
  });

  it('inject middleware does not set adapter when auth disabled but other DEMO_* vars are set', () => {
    process.env = { ...envSnapshot };
    delete process.env.DEMO_NOTIFY_GATEWAY_AUTH_ENABLED;
    process.env.DEMO_NOTIFY_GATEWAY_CLIENT_ID = 'client-x';
    process.env.DEMO_NOTIFY_EMAIL_ADAPTER = 'nodemailer';

    const mw = new DemoInjectDeliveryHeadersMiddleware();
    const next = jest.fn();
    const r = {
      method: 'POST',
      path: '/api/v1/notify',
      headers: { 'x-consumer-custom-id': 'client-x' },
    } as Request;
    mw.use(r, {} as Response, next);

    expect(r.headers['x-delivery-email-adapter']).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
