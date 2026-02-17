import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdaptersModule } from './adapters/adapters.module';
import { DeliveryContextModule } from './common/delivery-context/delivery-context.module';
import { GcNotifyApiModule } from './gc-notify/v2/core/gc-notify-api.module';
import { GcNotifyManagementModule } from './gc-notify/v2/contrib/gc-notify-management.module';
import { GcNotifyModule } from './gc-notify/gc-notify.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import configuration from './config/configuration';

const config = configuration();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [configuration],
    }),
    AdaptersModule.forRoot({}),
    DeliveryContextModule,
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
