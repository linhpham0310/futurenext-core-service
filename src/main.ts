// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'; // Import filter
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService); // Lấy ConfigService từ app instance
  const port = configService.get<number>('PORT', 3000); // Đọc PORT từ env, default 3000
  const nodeEnv = configService.get<string>('NODE_ENV', 'development'); // Đọc NODE_ENV

  // --- 1. Global Prefix ---
  app.setGlobalPrefix(''); // Tất cả API sẽ có dạng /api/v1/...

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
      origin: 'http://localhost:3000', // Cho phép frontend dev gọi tới
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true, // Cho phép gửi/nhận cookie (quan trọng cho refresh token)
    });
    Logger.log(
      'CORS enabled for development origin: http://localhost:3000',
      'Bootstrap',
    );
  } // Production CORS nên cấu hình ở tầng infrastructure (Cloud Run/Gateway)

  // --- 5. Graceful Shutdown ---
  app.enableShutdownHooks(); // Cho phép xử lý tín hiệu SIGTERM từ container orchestrator

  // --- Khởi chạy Server ---
  await app.listen(port);

  // --- Logging thông tin khởi động ---
  Logger.log(`🚀 Server running on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`🌱 Environment: ${nodeEnv}`, 'Bootstrap');
}
bootstrap(); // Chạy hàm bootstrap
