import { Module } from '@nestjs/common';
import { DeliveryContextModule } from '../common/delivery-context/delivery-context.module';
import { MeController } from './me.controller';

@Module({
  imports: [DeliveryContextModule],
  controllers: [MeController],
})
export class ContextModule {}
