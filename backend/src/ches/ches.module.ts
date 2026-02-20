import { Module } from '@nestjs/common';
import { ChesController } from './v1/core/ches.controller';

@Module({
  controllers: [ChesController],
})
export class ChesModule {}
