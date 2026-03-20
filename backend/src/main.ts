import './load-env';
import type { Application } from 'express';
import rTracer from 'cls-rtracer';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { httpLogger, log } from './common/logging';
import { PinoLoggerService } from './common/logging/pino-logger.service';
import { createRateLimiters } from './common/rate-limit/rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(new PinoLoggerService());

  const configService = app.get(ConfigService);

  // Request ID and HTTP logging (must run early)
  app.use(
    rTracer.expressMiddleware({
      useHeader: true,
      headerName: 'X-Request-Id',
      echoHeader: true,
    }),
  );
  app.use(httpLogger);

  // Global rate limit (route-specific limits applied via RateLimitModule)
  const rateLimitConfig = configService.get<{
    windowMs: number;
    max: number;
    apiWindowMs: number;
    apiMax: number;
    publicWindowMs: number;
    publicMax: number;
  }>('rateLimit');
  const { globalRateLimit } = createRateLimiters(rateLimitConfig);
  (app.getHttpAdapter().getInstance() as Application).use(globalRateLimit);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Unified Notify API')
    .setDescription(
      'Unified notification API providing provider-agnostic /notify interface, plus CHES and GC Notify extensions.',
    )
    .setVersion('1.0.0')
    .addServer('/api/v1', 'Default server')
    .addApiKey(
      { type: 'apiKey', name: 'Authorization', in: 'header' },
      'api-key',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('CHES', 'Common Hosted Email Service passthrough API')
    .addTag('Notify', 'Unified notification send and track')
    .addTag('Identities', 'Identity management (email, SMS sender)')
    .addTag(
      'GC Notify',
      'GC Notify API replica - notifications, templates, bulk',
    )
    .addTag('Templates', 'Template management for notifications')
    .addTag('Defaults', 'Tenant defaults')
    .addTag('NotifyTypes', 'Notify type defaults profiles')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  const emailAdapter =
    configService.get<string>('delivery.email') ?? 'nodemailer';
  const smsAdapter = configService.get<string>('delivery.sms') ?? 'twilio';
  const templateEngine =
    configService.get<string>('gcNotify.defaultTemplateEngine') ?? 'jinja2';

  log.info({ port }, 'BC Notify API running');
  log.info(`Swagger docs: http://localhost:${port}/api/docs`);
  log.info({ emailAdapter, smsAdapter, templateEngine }, 'Adapters configured');
}

void bootstrap();
