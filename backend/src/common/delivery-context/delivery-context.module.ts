import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdaptersModule } from '../../adapters/adapters.module';
import { DeliveryContextMiddleware } from './delivery-context.middleware';
import { DeliveryContextService } from './delivery-context.service';
import { DeliveryContextStorage } from './delivery-context.storage';
import { DeliveryAdapterResolver } from './delivery-adapter.resolver';

@Module({
  imports: [ConfigModule, AdaptersModule],
  providers: [
    DeliveryContextStorage,
    DeliveryContextMiddleware,
    DeliveryContextService,
    DeliveryAdapterResolver,
  ],
  exports: [DeliveryContextService, DeliveryAdapterResolver, DeliveryContextStorage],
})
export class DeliveryContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(DeliveryContextMiddleware)
      .forRoutes('*');
  }
}
