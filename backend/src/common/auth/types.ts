import type { Request } from 'express';

export type PrincipalType = 'service' | 'user';
export type AuthSource = 'gateway-service-client' | 'gc-notify-api-key';
export type AuthStrategyName = AuthSource;

export interface RequestPrincipal {
  type: PrincipalType;
  subjectId: string;
  workspaceId: string;
  workspaceKind?: string;
  authSource: AuthSource;
  gatewayClientId?: string;
  claims?: Record<string, unknown>;
}

export interface ServiceClientRecord {
  id: string;
  gatewayClientId: string;
  workspaceId: string;
  active: boolean;
  source?: string;
  name?: string;
}

export interface WorkspaceRecord {
  id: string;
  kind: string;
  active: boolean;
  externalSystem?: string;
  externalId?: string;
}

export interface WorkspaceBindingRecord {
  id: string;
  workspaceId: string;
  providerCode: string;
  externalWorkspaceId: string;
  status: string;
}

export interface WorkspaceAuthBootstrapData {
  workspaces?: WorkspaceRecord[];
  serviceClients?: ServiceClientRecord[];
  workspaceBindings?: WorkspaceBindingRecord[];
}

export type AuthenticatedRequest = Request & {
  principal?: RequestPrincipal;
  authResolutionError?: Error;
};
