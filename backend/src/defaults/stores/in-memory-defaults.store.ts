import { Injectable } from '@nestjs/common';
import type { DefaultsStore } from './defaults-store.interface';
import type { TenantDefaults } from '../v1/core/schemas/tenant-defaults';

const DEFAULT_WORKSPACE = 'default';

@Injectable()
export class InMemoryDefaultsStore implements DefaultsStore {
  private readonly store = new Map<string, TenantDefaults>();

  get(workspaceId: string = DEFAULT_WORKSPACE): TenantDefaults {
    return this.store.get(workspaceId) ?? {};
  }

  set(workspaceId: string, defaults: TenantDefaults): void {
    this.store.set(workspaceId, defaults);
  }

  merge(workspaceId: string, partial: Partial<TenantDefaults>): TenantDefaults {
    const existing = this.get(workspaceId);
    const merged = { ...existing, ...partial };
    this.set(workspaceId, merged);
    return merged;
  }
}
