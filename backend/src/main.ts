import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const emailAdapter =
    configService.get<string>('delivery.email') ?? 'nodemailer';
  const smsAdapter = configService.get<string>('delivery.sms') ?? 'twilio';
  const templateEngine =
    configService.get<string>('gcNotify.defaultTemplateEngine') ?? 'jinja2';

  logger.log(`BC Notify API running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(
    `Adapters: email=${emailAdapter}, sms=${smsAdapter}, template=${templateEngine}`,
  );
}

void bootstrap();
