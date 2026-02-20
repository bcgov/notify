import { Module } from '@nestjs/common';
import { NotifyController } from './v1/core/notify.controller';
import { NotifyService } from './notify.service';
import { DeliveryContextModule } from '../common/delivery-context/delivery-context.module';
import { TemplateResolutionModule } from '../common/template-resolution/template-resolution.module';
import { IdentitiesModule } from '../identities/identities.module';
import { NotifyTypesModule } from '../notify-types/notify-types.module';
import { DefaultsModule } from '../defaults/defaults.module';

@Module({
  imports: [
    DeliveryContextModule,
    TemplateResolutionModule,
    IdentitiesModule,
    NotifyTypesModule,
    DefaultsModule,
  ],
  controllers: [NotifyController],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
