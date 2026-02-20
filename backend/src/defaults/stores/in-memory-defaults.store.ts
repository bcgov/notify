import { Injectable } from '@nestjs/common';
import type { TenantDefaults } from '../schemas/tenant-defaults';

const DEFAULT_TENANT = 'default';

@Injectable()
export class InMemoryDefaultsStore {
  private readonly store = new Map<string, TenantDefaults>();

  get(tenantId: string = DEFAULT_TENANT): TenantDefaults {
    return this.store.get(tenantId) ?? {};
  }

  set(tenantId: string, defaults: TenantDefaults): void {
    this.store.set(tenantId, defaults);
  }

  merge(tenantId: string, partial: Partial<TenantDefaults>): TenantDefaults {
    const existing = this.get(tenantId);
    const merged = { ...existing, ...partial };
    this.set(tenantId, merged);
    return merged;
  }
}
