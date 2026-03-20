import { Module } from '@nestjs/common';
import { DemoInjectDeliveryHeadersMiddleware } from './demo-inject-delivery-headers.middleware';
import { DemoGatewayNotifyAuthStrategy } from './demo-gateway-notify-auth.strategy';
import { DemoNotifySeedService } from './demo-notify-seed.service';
import { IdentitiesModule } from '../identities/identities.module';
import { DefaultsModule } from '../defaults/defaults.module';

@Module({
  imports: [IdentitiesModule, DefaultsModule],
  providers: [
    DemoInjectDeliveryHeadersMiddleware,
    DemoGatewayNotifyAuthStrategy,
    DemoNotifySeedService,
  ],
  exports: [DemoInjectDeliveryHeadersMiddleware, DemoGatewayNotifyAuthStrategy],
})
export class DemoNotifyGatewayModule {}
