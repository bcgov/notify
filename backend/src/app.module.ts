import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TransportsModule } from './transports/transports.module';
import {
  EMAIL_TRANSPORT_REGISTRY,
  SMS_TRANSPORT_REGISTRY,
} from './transports/transport.registry';
import { GcNotifyModule } from './gc-notify/gc-notify.module';
import { GcNotifyApiModule } from './gc-notify/v2/core/gc-notify-api.module';
import { GcNotifyManagementModule } from './gc-notify/v2/contrib/gc-notify-management.module';
import configuration from './config/configuration';

const config = configuration();
const transportOptions = {
  emailTransport:
    EMAIL_TRANSPORT_REGISTRY[config.transport?.email ?? 'nodemailer'] ??
    EMAIL_TRANSPORT_REGISTRY.nodemailer,
  smsTransport:
    SMS_TRANSPORT_REGISTRY[config.transport?.sms ?? 'twilio'] ??
    SMS_TRANSPORT_REGISTRY.twilio,
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TransportsModule.forRoot(transportOptions),
    HealthModule,
    NotificationsModule,
    GcNotifyModule.forRoot(),
    GcNotifyManagementModule,
    GcNotifyApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
