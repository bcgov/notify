import { Module } from '@nestjs/common';
import { IdentitiesController } from './v1/core/identities.controller';
import { IdentitiesService } from './identities.service';

@Module({
  controllers: [IdentitiesController],
  providers: [IdentitiesService],
  exports: [IdentitiesService],
})
export class IdentitiesModule {}
