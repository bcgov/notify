import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdaptersModule } from './adapters/adapters.module';
import {
  EMAIL_ADAPTER_REGISTRY,
  SMS_ADAPTER_REGISTRY,
} from './adapters/delivery.registry';
import { GcNotifyModule } from './gc-notify/gc-notify.module';
import { GcNotifyApiModule } from './gc-notify/v2/core/gc-notify-api.module';
import { GcNotifyManagementModule } from './gc-notify/v2/contrib/gc-notify-management.module';
import configuration from './config/configuration';

const config = configuration();
const adapterOptions = {
  emailAdapter:
    EMAIL_ADAPTER_REGISTRY[config.delivery?.email ?? 'nodemailer'] ??
    EMAIL_ADAPTER_REGISTRY.nodemailer,
  smsAdapter:
    SMS_ADAPTER_REGISTRY[config.delivery?.sms ?? 'twilio'] ??
    SMS_ADAPTER_REGISTRY.twilio,
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    AdaptersModule.forRoot(adapterOptions),
    HealthModule,
    NotificationsModule,
    GcNotifyModule.forRoot({
      defaultTemplateEngine: config.gcNotify?.defaultTemplateEngine ?? 'jinja2',
    }),
    GcNotifyManagementModule,
    GcNotifyApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
