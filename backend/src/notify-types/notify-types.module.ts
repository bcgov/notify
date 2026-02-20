import { Module } from '@nestjs/common';
import { NotifyTypesController } from './v1/core/notify-types.controller';
import { NotifyTypesService } from './notify-types.service';
import { InMemoryNotifyTypeStore } from './stores/in-memory-notify-type.store';

@Module({
  controllers: [NotifyTypesController],
  providers: [NotifyTypesService, InMemoryNotifyTypeStore],
  exports: [NotifyTypesService],
})
export class NotifyTypesModule {}
