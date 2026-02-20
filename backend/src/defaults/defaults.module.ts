import { Module } from '@nestjs/common';
import { DefaultsController } from './defaults.controller';
import { DefaultsService } from './defaults.service';
import { InMemoryDefaultsStore } from './stores/in-memory-defaults.store';

@Module({
  controllers: [DefaultsController],
  providers: [DefaultsService, InMemoryDefaultsStore],
  exports: [DefaultsService],
})
export class DefaultsModule {}
