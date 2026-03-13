import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import type {
  ServiceClientRecord,
  WorkspaceAuthBootstrapData,
  WorkspaceRecord,
} from '../../types';

@Injectable()
export class WorkspaceAuthBootstrapService {
  private readonly data: WorkspaceAuthBootstrapData;

  constructor(private readonly configService: ConfigService) {
    this.data = this.loadBootstrapData();
  }

  getServiceClients(): ServiceClientRecord[] {
    return this.data.serviceClients ?? [];
  }

  getWorkspaces(): WorkspaceRecord[] {
    return this.data.workspaces ?? [];
  }

  private loadBootstrapData(): WorkspaceAuthBootstrapData {
    const inlineJson = this.configService.get<string>('auth.bootstrap.json');
    const bootstrapPath = this.configService.get<string>('auth.bootstrap.path');
    const bootstrap = inlineJson
      ? this.parseBootstrap(inlineJson, 'AUTH_BOOTSTRAP_JSON')
      : bootstrapPath
        ? this.loadBootstrapFromFile(bootstrapPath)
        : {};

    return {
      ...bootstrap,
      workspaces: this.withDefaultWorkspace(bootstrap.workspaces ?? []),
      serviceClients: bootstrap.serviceClients ?? [],
    };
  }

  private loadBootstrapFromFile(
    configuredPath: string,
  ): WorkspaceAuthBootstrapData {
    const bootstrapPath = isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath);

    if (!existsSync(bootstrapPath)) {
      throw new Error(
        `Workspace auth bootstrap file not found: ${bootstrapPath}`,
      );
    }

    const content = readFileSync(bootstrapPath, 'utf-8');
    return this.parseBootstrap(content, bootstrapPath);
  }

  private parseBootstrap(
    raw: string,
    source: string,
  ): WorkspaceAuthBootstrapData {
    try {
      const parsed = JSON.parse(raw) as WorkspaceAuthBootstrapData;
      return parsed ?? {};
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new Error(
        `Invalid workspace auth bootstrap JSON in ${source}: ${message}`,
      );
    }
  }

  private withDefaultWorkspace(
    workspaces: WorkspaceRecord[],
  ): WorkspaceRecord[] {
    const defaultWorkspaceId =
      this.configService.get<string>(
        'auth.gcNotifyApiKey.defaultWorkspaceId',
      ) ?? 'default';

    if (
      !defaultWorkspaceId ||
      workspaces.some((item) => item.id === defaultWorkspaceId)
    ) {
      return workspaces;
    }

    return [
      ...workspaces,
      {
        id: defaultWorkspaceId,
        kind: 'local',
        active: true,
      },
    ];
  }
}
