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
import { DemoGatewayNotifyAuthStrategy } from '../../demo-notify-gateway/demo-gateway-notify-auth.strategy';
import { DemoNotifyGatewayModule } from '../../demo-notify-gateway/demo-notify-gateway.module';

@Global()
@Module({
  imports: [ConfigModule, DemoNotifyGatewayModule],
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
        demoGatewayNotifyAuthStrategy: DemoGatewayNotifyAuthStrategy,
        gatewayServiceClientAuthStrategy: GatewayServiceClientAuthStrategy,
        gcNotifyApiKeyAuthStrategy: GcNotifyApiKeyAuthStrategy,
      ): AuthStrategy[] => [
        demoGatewayNotifyAuthStrategy,
        gatewayServiceClientAuthStrategy,
        gcNotifyApiKeyAuthStrategy,
      ],
      inject: [
        DemoGatewayNotifyAuthStrategy,
        GatewayServiceClientAuthStrategy,
        GcNotifyApiKeyAuthStrategy,
      ],
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
