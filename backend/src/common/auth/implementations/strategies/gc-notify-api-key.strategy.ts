import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { WORKSPACE_REGISTRY } from '../../tokens';
import type { WorkspaceRegistry } from '../../interfaces/workspace.registry';
import type { AuthStrategy } from '../../interfaces/auth-strategy.interface';
import type { RequestPrincipal } from '../../types';

@Injectable()
export class GcNotifyApiKeyAuthStrategy implements AuthStrategy {
  readonly name = 'gc-notify-api-key' as const;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WORKSPACE_REGISTRY)
    private readonly workspaceRegistry: WorkspaceRegistry,
  ) {}

  authenticate(request: Request): RequestPrincipal | null {
    const presentedApiKey = this.extractGcNotifyApiKey(request);
    if (!presentedApiKey) {
      return null;
    }

    const isEnabled =
      this.configService.get<boolean>('auth.gcNotifyApiKey.enabled') ?? true;
    if (!isEnabled) {
      throw new UnauthorizedException(
        'GC Notify API key authentication is disabled',
      );
    }

    const configuredApiKey = this.configService.get<string>(
      'auth.gcNotifyApiKey.apiKey',
    );
    if (!configuredApiKey || presentedApiKey !== configuredApiKey) {
      throw new UnauthorizedException('Invalid GC Notify API key');
    }

    const workspaceId =
      this.configService.get<string>(
        'auth.gcNotifyApiKey.defaultWorkspaceId',
      ) ?? 'default';
    const workspace = this.workspaceRegistry.findById(workspaceId);

    return {
      type: 'service',
      subjectId: 'gc-notify-api-key',
      workspaceId,
      workspaceKind: workspace?.kind ?? 'local',
      gatewayClientId: 'gc-notify-api-key',
      authSource: 'gc-notify-api-key',
    };
  }

  private extractGcNotifyApiKey(request: Request): string | undefined {
    const authHeader = this.getHeader(request, 'authorization');
    if (!authHeader) {
      return undefined;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'ApiKey-v1' || !token) {
      return undefined;
    }

    return token;
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
