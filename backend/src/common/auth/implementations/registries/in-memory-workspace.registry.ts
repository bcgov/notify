import { Injectable } from '@nestjs/common';
import type { WorkspaceRegistry } from '../../interfaces/workspace.registry';
import type { WorkspaceRecord } from '../../types';
import { WorkspaceAuthBootstrapService } from '../bootstrap/workspace-auth-bootstrap.service';

@Injectable()
export class InMemoryWorkspaceRegistry implements WorkspaceRegistry {
  private readonly workspaces: Map<string, WorkspaceRecord>;

  constructor(bootstrapService: WorkspaceAuthBootstrapService) {
    this.workspaces = new Map(
      bootstrapService
        .getWorkspaces()
        .map((workspace) => [workspace.id, workspace]),
    );
  }

  findById(workspaceId: string): WorkspaceRecord | undefined {
    return this.workspaces.get(workspaceId);
  }
}
