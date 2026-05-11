// src/db/seeds/run-seed.ts
import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module'; // Import module seeding
import { SeedService } from './seed.service'; // Import service seeding
import { Logger } from '@nestjs/common'; // Dùng Logger của NestJS

/**
 * Hàm bootstrap để khởi chạy quá trình seeding.
 * Nó tạo một NestJS application context riêng biệt,
 * lấy ra SeedService và thực thi hàm seed().
 */
async function bootstrap() {
  // Tạo NestJS context chỉ load SeedModule và các module phụ thuộc của nó
  // logger: false để tránh log mặc định của NestJS, chỉ dùng logger tùy chỉnh bên dưới
  const appContext = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['warn', 'error'], // Chỉ hiển thị warning và error từ NestJS core
  });

  // Tạo một Logger instance riêng cho script này
  const logger = new Logger('RunSeedScript');

  logger.log('🌱 NestJS application context created specifically for seeding.');

  // Lấy instance của SeedService từ context
  const seedService = appContext.get(SeedService);

  logger.log('🚀 Executing database seed sequence...');

  try {
    // Gọi hàm seed() trong SeedService
    await seedService.seed();
    logger.log('✅ Seeding sequence completed successfully.');
    process.exitCode = 0; // Thoát với mã thành công
  } catch (error) {
    logger.error('❌ Seeding sequence failed:');
    logger.error(error.stack || error.message); // Log chi tiết lỗi
    process.exitCode = 1; // Thoát với mã lỗi
  } finally {
    // Luôn đóng context để giải phóng tài nguyên (đặc biệt là kết nối DB)
    logger.log('⏳ Closing NestJS application context...');
    await appContext.close();
    logger.log('🚪 Application context closed.');
    // process.exit(process.exitCode); // Đảm bảo script thoát hẳn (tùy chọn)
  }
}

// Chạy hàm bootstrap
bootstrap();
