import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthenticatedGuard } from '../guards/authenticated.guard';
import type { AuthStrategy } from './interfaces/auth-strategy.interface';
import { WorkspaceAuthBootstrapService } from './implementations/bootstrap/workspace-auth-bootstrap.service';
import { InMemoryServiceClientRegistry } from './implementations/registries/in-memory-service-client.registry';
import { InMemoryWorkspaceRegistry } from './implementations/registries/in-memory-workspace.registry';
import { GcNotifyApiKeyAuthStrategy } from './implementations/strategies/gc-notify-api-key.strategy';
import { GatewayServiceClientAuthStrategy } from './implementations/strategies/gateway-service-client.strategy';
import { PrincipalResolver } from './principal-resolver.service';
import {
  AUTH_STRATEGIES,
  SERVICE_CLIENT_REGISTRY,
  WORKSPACE_REGISTRY,
} from './tokens';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    AuthenticatedGuard,
    PrincipalResolver,
    WorkspaceAuthBootstrapService,
    InMemoryServiceClientRegistry,
    InMemoryWorkspaceRegistry,
    GatewayServiceClientAuthStrategy,
    GcNotifyApiKeyAuthStrategy,
    {
      provide: SERVICE_CLIENT_REGISTRY,
      useExisting: InMemoryServiceClientRegistry,
    },
    {
      provide: WORKSPACE_REGISTRY,
      useExisting: InMemoryWorkspaceRegistry,
    },
    {
      provide: AUTH_STRATEGIES,
      useFactory: (
        gatewayServiceClientAuthStrategy: GatewayServiceClientAuthStrategy,
        gcNotifyApiKeyAuthStrategy: GcNotifyApiKeyAuthStrategy,
      ): AuthStrategy[] => [
        gatewayServiceClientAuthStrategy,
        gcNotifyApiKeyAuthStrategy,
      ],
      inject: [GatewayServiceClientAuthStrategy, GcNotifyApiKeyAuthStrategy],
    },
  ],
  exports: [
    AuthenticatedGuard,
    PrincipalResolver,
    WorkspaceAuthBootstrapService,
    SERVICE_CLIENT_REGISTRY,
    WORKSPACE_REGISTRY,
  ],
})
export class AuthModule {}
