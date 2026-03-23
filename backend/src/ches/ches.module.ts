import { Module } from '@nestjs/common';
import { DeliveryContextModule } from '../common/delivery-context/delivery-context.module';
import { ChesController } from './v1/core/ches.controller';
import { ChesOAuthService } from './ches-oauth.service';
import { ChesApiClient } from './ches-api.client';
import { ChesService } from './ches.service';

@Module({
  imports: [DeliveryContextModule],
  controllers: [ChesController],
  providers: [ChesOAuthService, ChesApiClient, ChesService],
  exports: [ChesApiClient, ChesService],
})
export class ChesModule {}
