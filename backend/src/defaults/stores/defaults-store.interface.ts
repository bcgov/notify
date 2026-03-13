import type { TenantDefaults } from '../v1/core/schemas/tenant-defaults';

export interface DefaultsStore {
  get(workspaceId: string): TenantDefaults;
  merge(workspaceId: string, partial: Partial<TenantDefaults>): TenantDefaults;
}
