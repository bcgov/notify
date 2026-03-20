import {
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GatewayServiceClientAuthStrategy } from '../../../src/common/auth/implementations/strategies/gateway-service-client.strategy';
import {
  SERVICE_CLIENT_REGISTRY,
  WORKSPACE_REGISTRY,
} from '../../../src/common/auth/tokens';
import type { ServiceClientRegistry } from '../../../src/common/auth/interfaces/service-client.registry';
import type { WorkspaceRegistry } from '../../../src/common/auth/interfaces/workspace.registry';

describe('GatewayServiceClientAuthStrategy', () => {
  let strategy: GatewayServiceClientAuthStrategy;
  let serviceClientRegistry: jest.Mocked<ServiceClientRegistry>;
  let workspaceRegistry: jest.Mocked<WorkspaceRegistry>;

  beforeEach(async () => {
    serviceClientRegistry = {
      findByGatewayClientId: jest.fn(),
    };
    workspaceRegistry = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayServiceClientAuthStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.gatewayServiceClient.clientIdHeader') {
                return 'x-consumer-custom-id';
              }
              return undefined;
            }),
          },
        },
        {
          provide: SERVICE_CLIENT_REGISTRY,
          useValue: serviceClientRegistry,
        },
        {
          provide: WORKSPACE_REGISTRY,
          useValue: workspaceRegistry,
        },
      ],
    }).compile();

    strategy = module.get(GatewayServiceClientAuthStrategy);
  });

  it('returns null when the gateway header is not present', () => {
    expect(strategy.authenticate({ headers: {} } as never)).toBeNull();
  });

  it('resolves a gateway service client to a principal', () => {
    serviceClientRegistry.findByGatewayClientId.mockReturnValue({
      id: 'svc-1',
      gatewayClientId: 'client-123',
      workspaceId: 'workspace-1',
      active: true,
    });
    workspaceRegistry.findById.mockReturnValue({
      id: 'workspace-1',
      kind: 'enterprise',
      active: true,
    });

    expect(
      strategy.authenticate({
        headers: { 'x-consumer-custom-id': 'client-123' },
      } as never),
    ).toEqual({
      type: 'service',
      subjectId: 'svc-1',
      workspaceId: 'workspace-1',
      workspaceKind: 'enterprise',
      gatewayClientId: 'client-123',
      authSource: 'gateway-service-client',
    });
  });

  it('throws when the service client is unknown', () => {
    serviceClientRegistry.findByGatewayClientId.mockReturnValue(undefined);

    expect(() =>
      strategy.authenticate({
        headers: { 'x-consumer-custom-id': 'missing-client' },
      } as never),
    ).toThrow(UnauthorizedException);
  });

  it('throws when the workspace is inactive', () => {
    serviceClientRegistry.findByGatewayClientId.mockReturnValue({
      id: 'svc-1',
      gatewayClientId: 'client-123',
      workspaceId: 'workspace-1',
      active: true,
    });
    workspaceRegistry.findById.mockReturnValue({
      id: 'workspace-1',
      kind: 'enterprise',
      active: false,
    });

    expect(() =>
      strategy.authenticate({
        headers: { 'x-consumer-custom-id': 'client-123' },
      } as never),
    ).toThrow(ForbiddenException);
  });

  it('requires the gateway header config when the strategy is active', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayServiceClientAuthStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
        {
          provide: SERVICE_CLIENT_REGISTRY,
          useValue: serviceClientRegistry,
        },
        {
          provide: WORKSPACE_REGISTRY,
          useValue: workspaceRegistry,
        },
      ],
    }).compile();

    const misconfiguredStrategy = module.get(GatewayServiceClientAuthStrategy);

    expect(() =>
      misconfiguredStrategy.authenticate({ headers: {} } as never),
    ).toThrow(InternalServerErrorException);
  });
});
