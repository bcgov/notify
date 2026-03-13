import type { WorkspaceRecord } from '../types';

export interface WorkspaceRegistry {
  findById(workspaceId: string): WorkspaceRecord | undefined;
}
