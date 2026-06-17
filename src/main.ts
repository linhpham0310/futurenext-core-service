// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix – giữ nguyên (không đổi)
  app.setGlobalPrefix('');

  // Middleware
  app.use(cookieParser());
  app.use(helmet());

  // CORS configuration – hỗ trợ development và Vercel preview
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  let allowedOrigins: string[] = [];
  if (corsOrigins) {
    allowedOrigins = corsOrigins.split(',');
  } else {
    allowedOrigins = ['http://localhost:3001', 'http://localhost:3000'];
  }

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FutureNext API')
    .setDescription('API documentation for FutureNext learning platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}
bootstrap();
