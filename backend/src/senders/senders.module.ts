import { Module } from '@nestjs/common';
import { SendersController } from './v1/core/senders.controller';
import { SendersService } from './senders.service';

@Module({
  controllers: [SendersController],
  providers: [SendersService],
  exports: [SendersService],
})
export class SendersModule {}
