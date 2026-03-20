import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { AuthStrategy } from '../../../src/common/auth/interfaces/auth-strategy.interface';
import { PrincipalResolver } from '../../../src/common/auth/principal-resolver.service';
import { AUTH_STRATEGIES } from '../../../src/common/auth/tokens';

describe('PrincipalResolver', () => {
  let service: PrincipalResolver;
  let gatewayStrategy: jest.Mocked<AuthStrategy>;
  let gcNotifyApiKeyStrategy: jest.Mocked<AuthStrategy>;
  let gatewayAuthenticateMock: jest.Mock;
  let gcNotifyAuthenticateMock: jest.Mock;

  beforeEach(async () => {
    gatewayAuthenticateMock = jest.fn();
    gcNotifyAuthenticateMock = jest.fn();
    gatewayStrategy = {
      name: 'gateway-service-client',
      authenticate: gatewayAuthenticateMock,
    };
    gcNotifyApiKeyStrategy = {
      name: 'gc-notify-api-key',
      authenticate: gcNotifyAuthenticateMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrincipalResolver,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'auth.strategies':
                  return ['gateway-service-client', 'gc-notify-api-key'];
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: AUTH_STRATEGIES,
          useValue: [gatewayStrategy, gcNotifyApiKeyStrategy],
        },
      ],
    }).compile();

    service = module.get(PrincipalResolver);
  });

  it('uses the first successful strategy and halts the cascade', () => {
    gatewayAuthenticateMock.mockReturnValue({
      type: 'service',
      subjectId: 'svc-1',
      workspaceId: 'workspace-1',
      workspaceKind: 'enterprise',
      gatewayClientId: 'client-123',
      authSource: 'gateway-service-client',
    });

    const request = { headers: {} } as never;
    const principal = service.resolveOptional(request);

    expect(principal).toEqual({
      type: 'service',
      subjectId: 'svc-1',
      workspaceId: 'workspace-1',
      workspaceKind: 'enterprise',
      gatewayClientId: 'client-123',
      authSource: 'gateway-service-client',
    });
    expect(gatewayAuthenticateMock).toHaveBeenCalledWith(request);
    expect(gcNotifyAuthenticateMock).not.toHaveBeenCalled();
  });

  it('falls through to later strategies when earlier ones do not apply', () => {
    gatewayAuthenticateMock.mockReturnValue(null);
    gcNotifyAuthenticateMock.mockReturnValue({
      type: 'service',
      subjectId: 'gc-notify-api-key',
      workspaceId: 'default',
      workspaceKind: 'local',
      gatewayClientId: 'gc-notify-api-key',
      authSource: 'gc-notify-api-key',
    });

    const principal = service.resolveOptional({
      headers: { authorization: 'ApiKey-v1 test-key' },
    } as never);

    expect(principal).toEqual({
      type: 'service',
      subjectId: 'gc-notify-api-key',
      workspaceId: 'default',
      workspaceKind: 'local',
      gatewayClientId: 'gc-notify-api-key',
      authSource: 'gc-notify-api-key',
    });
  });

  it('returns null when no strategy authenticates the request', () => {
    gatewayAuthenticateMock.mockReturnValue(null);
    gcNotifyAuthenticateMock.mockReturnValue(null);

    expect(service.resolveOptional({ headers: {} } as never)).toBeNull();
  });

  it('surfaces strategy failures immediately', () => {
    gatewayAuthenticateMock.mockImplementation(() => {
      throw new UnauthorizedException('Unknown service client');
    });

    expect(() => service.resolveOptional({ headers: {} } as never)).toThrow(
      UnauthorizedException,
    );
    expect(gcNotifyAuthenticateMock).not.toHaveBeenCalled();
  });

  it('fails fast when an unsupported strategy is configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrincipalResolver,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'auth.strategies':
                  return ['missing-strategy'];
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: AUTH_STRATEGIES,
          useValue: [gatewayStrategy, gcNotifyApiKeyStrategy],
        },
      ],
    }).compile();

    const misconfiguredService = module.get(PrincipalResolver);

    expect(() =>
      misconfiguredService.resolveOptional({ headers: {} } as never),
    ).toThrow(InternalServerErrorException);
  });
});
