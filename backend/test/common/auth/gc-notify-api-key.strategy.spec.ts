import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GcNotifyApiKeyAuthStrategy } from '../../../src/common/auth/implementations/strategies/gc-notify-api-key.strategy';
import { WORKSPACE_REGISTRY } from '../../../src/common/auth/tokens';
import type { WorkspaceRegistry } from '../../../src/common/auth/interfaces/workspace.registry';

describe('GcNotifyApiKeyAuthStrategy', () => {
  let strategy: GcNotifyApiKeyAuthStrategy;
  let workspaceRegistry: jest.Mocked<WorkspaceRegistry>;

  beforeEach(async () => {
    workspaceRegistry = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcNotifyApiKeyAuthStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'auth.gcNotifyApiKey.enabled':
                  return true;
                case 'auth.gcNotifyApiKey.defaultWorkspaceId':
                  return 'default';
                case 'auth.gcNotifyApiKey.apiKey':
                  return 'test-key';
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: WORKSPACE_REGISTRY,
          useValue: workspaceRegistry,
        },
      ],
    }).compile();

    strategy = module.get(GcNotifyApiKeyAuthStrategy);
  });

  it('returns null when the request is not using the gc notify api key format', () => {
    expect(strategy.authenticate({ headers: {} } as never)).toBeNull();
  });

  it('resolves the gc notify api key to a principal', () => {
    workspaceRegistry.findById.mockReturnValue({
      id: 'default',
      kind: 'local',
      active: true,
    });

    expect(
      strategy.authenticate({
        headers: { authorization: 'ApiKey-v1 test-key' },
      } as never),
    ).toEqual({
      type: 'service',
      subjectId: 'gc-notify-api-key',
      workspaceId: 'default',
      workspaceKind: 'local',
      gatewayClientId: 'gc-notify-api-key',
      authSource: 'gc-notify-api-key',
    });
  });

  it('throws when the api key is invalid', () => {
    expect(() =>
      strategy.authenticate({
        headers: { authorization: 'ApiKey-v1 wrong-key' },
      } as never),
    ).toThrow(UnauthorizedException);
  });
});
