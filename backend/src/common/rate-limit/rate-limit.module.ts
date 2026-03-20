import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestMethod } from '@nestjs/common';
import { createApiRateLimit, createPublicRateLimit } from './rate-limit';
import { HealthController } from '../../health/health.controller';
import { NotifyController } from '../../notify/v1/core/notify.controller';
import { ChesController } from '../../ches/v1/core/ches.controller';
import { GcNotifyController } from '../../gc-notify/v2/core/gc-notify.controller';
import { TemplatesController } from '../../templates/v1/core/templates.controller';
import { IdentitiesController } from '../../identities/v1/core/identities.controller';
import { DefaultsController } from '../../defaults/v1/core/defaults.controller';
import { NotifyTypesController } from '../../notify-types/v1/core/notify-types.controller';

@Module({})
export class RateLimitModule implements NestModule {
  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer): void {
    const rateLimitConfig = this.configService.get<{
      windowMs: number;
      max: number;
      apiWindowMs: number;
      apiMax: number;
      publicWindowMs: number;
      publicMax: number;
    }>('rateLimit');

    const publicRateLimit = createPublicRateLimit(rateLimitConfig);
    const apiRateLimit = createApiRateLimit(rateLimitConfig);

    consumer
      .apply(publicRateLimit)
      .forRoutes(
        HealthController,
        { path: 'api/docs', method: RequestMethod.ALL },
        { path: 'api/docs/(.*)', method: RequestMethod.ALL },
      );

    consumer
      .apply(apiRateLimit)
      .forRoutes(
        NotifyController,
        ChesController,
        GcNotifyController,
        TemplatesController,
        IdentitiesController,
        DefaultsController,
        NotifyTypesController,
      );
  }
}
