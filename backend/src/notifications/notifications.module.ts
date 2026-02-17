import { Module } from '@nestjs/common';
import { DeliveryContextModule } from '../common/delivery-context/delivery-context.module';
import { TemplateResolutionModule } from '../common/template-resolution/template-resolution.module';
import { SendersModule } from '../senders/senders.module';
import { NotificationsController } from './v1/core/notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [DeliveryContextModule, TemplateResolutionModule, SendersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
