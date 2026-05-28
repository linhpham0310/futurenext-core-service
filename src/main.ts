// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  //  QUAN TRỌNG: Đọc PORT từ environment, Cloud Run sẽ set là 8080
  // Không có giá trị mặc định để tránh nhầm lẫn
  const port = configService.get<number>('PORT');

  //  Nếu không có PORT, throw error rõ ràng
  if (!port) {
    throw new Error(
      'PORT environment variable is not set. Cloud Run requires PORT to be defined.',
    );
  }

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // --- 1. Global Prefix ---
  app.setGlobalPrefix('');

  // --- 2. Global Validation Pipe ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: nodeEnv === 'production',
    }),
  );

  // --- 3. Global Exception Filter ---
  app.useGlobalFilters(new HttpExceptionFilter());

  // --- 4. CORS for Development only ---
  if (nodeEnv === 'development') {
    app.enableCors({
      origin: 'http://localhost:3001',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    Logger.log(
      'CORS enabled for development origin: http://localhost:3001',
      'Bootstrap',
    );
  }

  // --- 5. Graceful Shutdown ---
  app.enableShutdownHooks();

  //  Đảm bảo lắng nghe trên tất cả interfaces (0.0.0.0)
  await app.listen(port, '0.0.0.0');
}
bootstrap();
