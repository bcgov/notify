import { Module } from '@nestjs/common';
import { ChesController } from './ches.controller';

@Module({
  controllers: [ChesController],
})
export class ChesModule {}
