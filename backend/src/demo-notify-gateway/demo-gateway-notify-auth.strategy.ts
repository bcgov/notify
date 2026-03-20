import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthStrategy } from '../common/auth/interfaces/auth-strategy.interface';
import type { RequestPrincipal } from '../common/auth/types';
import {
  getDemoNotifyGatewayClientHeaderName,
  getDemoNotifyGatewayClientId,
  getDemoNotifyWorkspaceId,
  isDemoNotifyGatewayAuthEnabled,
  requestMatchesDemoRequest,
} from './demo-notify-settings';

@Injectable()
export class DemoGatewayNotifyAuthStrategy implements AuthStrategy {
  readonly name = 'demo-gateway-notify' as const;

  authenticate(request: Request): RequestPrincipal | null {
    if (!isDemoNotifyGatewayAuthEnabled()) {
      return null;
    }

    if (!requestMatchesDemoRequest(request)) {
      return null;
    }

    const configuredId = getDemoNotifyGatewayClientId();
    if (!configuredId) {
      return null;
    }

    const headerName = getDemoNotifyGatewayClientHeaderName();
    const presented = this.getHeader(request, headerName);
    if (presented !== configuredId) {
      return null;
    }

    const workspaceId = getDemoNotifyWorkspaceId();

    return {
      type: 'service',
      subjectId: `demo-notify-gateway:${configuredId}`,
      workspaceId,
      workspaceKind: 'local',
      gatewayClientId: configuredId,
      authSource: 'demo-gateway-notify',
    };
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
