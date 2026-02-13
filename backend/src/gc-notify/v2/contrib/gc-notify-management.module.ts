import { Module } from '@nestjs/common';
import { GcNotifyManagementController } from './gc-notify-management.controller';

@Module({
  controllers: [GcNotifyManagementController],
})
export class GcNotifyManagementModule {}
