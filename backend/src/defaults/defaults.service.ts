import { Inject, Injectable } from '@nestjs/common';
import { DeliveryContextService } from '../common/delivery-context/delivery-context.service';
import { DEFAULTS_STORE } from './defaults.tokens';
import type { DefaultsStore } from './stores/defaults-store.interface';
import type { TenantDefaults } from './v1/core/schemas/tenant-defaults';

@Injectable()
export class DefaultsService {
  constructor(
    private readonly deliveryContextService: DeliveryContextService,
    @Inject(DEFAULTS_STORE) private readonly store: DefaultsStore,
  ) {}

  getDefaults(): TenantDefaults {
    return this.store.get(this.deliveryContextService.getWorkspaceId());
  }

  updateDefaults(partial: Partial<TenantDefaults>): TenantDefaults {
    const updatedAt = new Date().toISOString();
    return this.store.merge(this.deliveryContextService.getWorkspaceId(), {
      ...partial,
      updatedAt,
    });
  }
}
