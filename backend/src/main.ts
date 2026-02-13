import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS for API Gateway
  app.enableCors();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('BC Notify API')
    .setDescription('Notification service for BC Government teams')
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'Authorization', in: 'header' },
      'api-key',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Notifications', 'Send and track notifications')
    .addTag(
      'GC Notify',
      'GC Notify API replica - notifications, templates, bulk. Includes extension endpoints for sender and template management.',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`BC Notify API running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

void bootstrap();
