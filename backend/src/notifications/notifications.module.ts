import { Module } from '@nestjs/common';
import { NotificationsController } from './v1/core/notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
