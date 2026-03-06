import { Module } from '@nestjs/common';
import { ChesController } from './v1/core/ches.controller';
import { ChesOAuthService } from './ches-oauth.service';
import { ChesApiClient } from './ches-api.client';

@Module({
  controllers: [ChesController],
  providers: [ChesOAuthService, ChesApiClient],
  exports: [ChesApiClient],
})
export class ChesModule {}
