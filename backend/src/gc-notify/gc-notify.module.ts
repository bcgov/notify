import { DynamicModule, Module } from '@nestjs/common';
import { DeliveryContextModule } from '../common/delivery-context/delivery-context.module';
import { TemplateResolutionModule } from '../common/template-resolution/template-resolution.module';
import { GcNotifyApiClient } from './gc-notify-api.client';
import { GcNotifyService } from './gc-notify.service';
import { TemplatesModule } from '../templates/templates.module';
import { SendersModule } from '../senders/senders.module';

/** Reserved for future options. Template resolution is provided by TemplateResolutionModule. */
export type GcNotifyModuleOptions = Record<string, never>;

/**
 * GC Notify core module - provides GcNotifyService with template resolution.
 * Template resolution is provided by TemplateResolutionModule (shared).
 * Email/SMS adapters are provided by AdaptersModule (shared).
 */
@Module({})
export class GcNotifyModule {
  static forRoot(_options: GcNotifyModuleOptions = {}): DynamicModule {
    return {
      module: GcNotifyModule,
      global: true,
      imports: [
        DeliveryContextModule,
        TemplateResolutionModule,
        TemplatesModule,
        SendersModule,
      ],
      providers: [GcNotifyApiClient, GcNotifyService],
      exports: [GcNotifyService],
    };
  }
}
