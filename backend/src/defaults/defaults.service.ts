import { Injectable } from '@nestjs/common';
import { InMemoryDefaultsStore } from './stores/in-memory-defaults.store';
import type { TenantDefaults } from './v1/core/schemas/tenant-defaults';

@Injectable()
export class DefaultsService {
  constructor(private readonly store: InMemoryDefaultsStore) {}

  getDefaults(): TenantDefaults {
    return this.store.get();
  }

  updateDefaults(partial: Partial<TenantDefaults>): TenantDefaults {
    const updatedAt = new Date().toISOString();
    return this.store.merge('default', { ...partial, updatedAt });
  }
}
