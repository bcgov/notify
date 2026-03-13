import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdaptersModule } from './adapters/adapters.module';
import { AuthModule } from './common/auth/auth.module';
import { DeliveryContextModule } from './common/delivery-context/delivery-context.module';
import { TemplateResolutionModule } from './common/template-resolution/template-resolution.module';
import { GcNotifyApiModule } from './gc-notify/v2/core/gc-notify-api.module';
import { GcNotifyModule } from './gc-notify/gc-notify.module';
import { TemplatesModule } from './templates/templates.module';
import { IdentitiesModule } from './identities/identities.module';
import { DefaultsModule } from './defaults/defaults.module';
import { NotifyTypesModule } from './notify-types/notify-types.module';
import { ChesModule } from './ches/ches.module';
import { HealthModule } from './health/health.module';
import { ContextModule } from './context/context.module';
import { NotifyModule } from './notify/notify.module';
import configuration from './config/configuration';

const config = configuration();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [configuration],
    }),
    AuthModule,
    AdaptersModule.forRoot({}),
    DeliveryContextModule,
    TemplateResolutionModule.forRoot({
      defaultTemplateEngine: config.gcNotify?.defaultTemplateEngine ?? 'jinja2',
    }),
    HealthModule,
    ContextModule,
    NotifyModule,
    GcNotifyModule.forRoot({}),
    GcNotifyApiModule,
    TemplatesModule,
    IdentitiesModule,
    DefaultsModule,
    NotifyTypesModule,
    ChesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
