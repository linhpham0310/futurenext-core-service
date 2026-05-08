// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'; // Import filter

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Đọc trực tiếp từ process.env thay vì ConfigService
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  // --- 1. Global Prefix ---
  app.setGlobalPrefix('api/v1'); // Tất cả API sẽ có dạng /api/v1/...

  // --- 2. Global Validation Pipe ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ thuộc tính không có trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu có thuộc tính thừa
      transform: true, // Tự động chuyển đổi kiểu dữ liệu
      transformOptions: {
        enableImplicitConversion: true, // Cho phép chuyển đổi ngầm định
      },
      // Không hiển thị chi tiết lỗi validation ở production
      disableErrorMessages: nodeEnv === 'production',
    }),
  );

  // --- 3. Global Exception Filter ---
  app.useGlobalFilters(new HttpExceptionFilter()); // Áp dụng filter chuẩn hóa lỗi

  // --- 4. CORS for Development only ---
  if (nodeEnv === 'development') {
    app.enableCors({
      origin: 'http://localhost:3001', // Cho phép frontend dev gọi tới
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true, // Cho phép gửi/nhận cookie (quan trọng cho refresh token)
    });
    Logger.log(
      'CORS enabled for development origin: http://localhost:3001',
      'Bootstrap',
    );
  } // Production CORS nên cấu hình ở tầng infrastructure (Cloud Run/Gateway)

  // --- 5. Graceful Shutdown ---
  app.enableShutdownHooks(); // Cho phép xử lý tín hiệu SIGTERM từ container orchestrator

  // --- Khởi chạy Server ---
  await app.listen(port);

  // --- Logging thông tin khởi động ---
  Logger.log(
    `🚀 Server running on http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
  Logger.log(`🌱 Environment: ${nodeEnv}`, 'Bootstrap');
}
bootstrap(); // Chạy hàm bootstrap
