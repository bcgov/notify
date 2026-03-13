import { Module } from '@nestjs/common';
import { DeliveryContextModule } from '../common/delivery-context/delivery-context.module';
import { DefaultsController } from './v1/core/defaults.controller';
import { DefaultsService } from './defaults.service';
import { DEFAULTS_STORE } from './defaults.tokens';
import { InMemoryDefaultsStore } from './stores/in-memory-defaults.store';

@Module({
  imports: [DeliveryContextModule],
  controllers: [DefaultsController],
  providers: [
    DefaultsService,
    InMemoryDefaultsStore,
    {
      provide: DEFAULTS_STORE,
      useExisting: InMemoryDefaultsStore,
    },
  ],
  exports: [DefaultsService],
})
export class DefaultsModule {}
