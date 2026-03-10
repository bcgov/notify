import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SERVICE_CLIENT_REGISTRY, WORKSPACE_REGISTRY } from '../../tokens';
import type { ServiceClientRegistry } from '../../interfaces/service-client.registry';
import type { WorkspaceRegistry } from '../../interfaces/workspace.registry';
import type { AuthStrategy } from '../../interfaces/auth-strategy.interface';
import type { RequestPrincipal, WorkspaceRecord } from '../../types';

@Injectable()
export class GatewayServiceClientAuthStrategy implements AuthStrategy {
  readonly name = 'gateway-service-client' as const;

  constructor(
    private readonly configService: ConfigService,
    @Inject(SERVICE_CLIENT_REGISTRY)
    private readonly serviceClientRegistry: ServiceClientRegistry,
    @Inject(WORKSPACE_REGISTRY)
    private readonly workspaceRegistry: WorkspaceRegistry,
  ) {}

  authenticate(request: Request): RequestPrincipal | null {
    const gatewayClientId = this.getHeader(
      request,
      this.getRequiredGatewayClientIdHeader(),
    );
    if (!gatewayClientId) {
      return null;
    }

    const serviceClient =
      this.serviceClientRegistry.findByGatewayClientId(gatewayClientId);
    if (!serviceClient) {
      throw new UnauthorizedException(
        `Unknown service client "${gatewayClientId}"`,
      );
    }
    if (!serviceClient.active) {
      throw new ForbiddenException(
        `Service client "${gatewayClientId}" is inactive`,
      );
    }

    const workspace = this.getActiveWorkspace(serviceClient.workspaceId);

    return {
      type: 'service',
      subjectId: serviceClient.id,
      workspaceId: workspace.id,
      workspaceKind: workspace.kind,
      gatewayClientId: serviceClient.gatewayClientId,
      authSource: 'gateway-service-client',
    };
  }

  private getActiveWorkspace(workspaceId: string): WorkspaceRecord {
    const workspace = this.workspaceRegistry.findById(workspaceId);
    if (!workspace) {
      throw new UnauthorizedException(
        `Workspace "${workspaceId}" not found for authenticated principal`,
      );
    }
    if (!workspace.active) {
      throw new ForbiddenException(`Workspace "${workspaceId}" is inactive`);
    }
    return workspace;
  }

  private getRequiredGatewayClientIdHeader(): string {
    const headerName = this.configService.get<string>(
      'auth.gatewayServiceClient.clientIdHeader',
    );
    if (!headerName?.trim()) {
      throw new InternalServerErrorException(
        'AUTH_GATEWAY_SERVICE_CLIENT_ID_HEADER must be configured when gateway-service-client auth is enabled',
      );
    }
    return headerName.trim().toLowerCase();
  }

  private getHeader(request: Request, name: string): string | undefined {
    const key = name.toLowerCase();
    const value = request.headers[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value) && value[0]?.trim()) {
      return value[0].trim();
    }
    return undefined;
  }
}
