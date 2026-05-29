// src/app.module.ts
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
// Import các module nghiệp vụ (đã tạo cấu trúc file ở SO-BE-01/SO-BE-03)
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SharedModule } from './shared/shared.module';
// Import AppController nếu giữ lại health check endpoint (từ SO-INT-01)
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    // --- 1. ConfigModule: Đọc biến môi trường (.env / system) ---
    ConfigModule.forRoot({
      isGlobal: true, // Cung cấp ConfigService toàn cục
      // Ưu tiên biến môi trường hệ thống hơn file .env
      ignoreEnvFile: process.env.NODE_ENV === 'production', // Bỏ qua .env ở production
      envFilePath: '.env', // File cho local development
    }),

    // --- 2. TypeOrmModule: Kết nối PostgreSQL ---
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const isDevelopment = nodeEnv !== 'production';
        const dbUrl = configService.get<string>('DATABASE_URL');

        if (!dbUrl) {
          throw new Error(
            'FATAL ERROR: DATABASE_URL environment variable is not set.',
          );
        }

        Logger.log(
          `[DB Config] NODE_ENV: ${nodeEnv}, Synchronize: ${isDevelopment}`,
          'TypeOrmModule',
        );

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pg = require('pg');

        return {
          type: 'postgres',
          url: dbUrl,
          driver: pg,
          autoLoadEntities: true,
          synchronize: false,
          logging: isDevelopment
            ? ['query', 'error', 'warn']
            : ['error', 'warn'],
          ssl: !isDevelopment ? { rejectUnauthorized: false } : false,
        };
      },
    }),

    // --- 3. ThrottlerModule: Rate Limiting với Redis ---
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule], // Cần ConfigModule và Redis Storage Module
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const ttl = configService.get<number>('THROTTLE_TTL', 60 * 1000); // Default 60s (ms)
        const limit = configService.get<number>('THROTTLE_LIMIT', 10); // Default 10 requests/TTL

        // Cảnh báo nếu thiếu Redis URL (trừ môi trường test)
        if (!redisUrl && configService.get<string>('NODE_ENV') !== 'test') {
          Logger.warn(
            'REDIS_URL not found. Throttler is using in-memory storage (inefficient for scaling).',
            'ThrottlerModule',
          );
        }

        Logger.log(
          `Throttler default config: TTL=${ttl}ms, Limit=${limit}, Storage=${redisUrl ? 'Redis' : 'InMemory'}`,
          'ThrottlerModule',
        );

        return [
          {
            // Cấu hình default
            ttl: ttl,
            limit: limit,
            storage: redisUrl
              ? new ThrottlerStorageRedisService(redisUrl)
              : undefined, // Dùng Redis nếu có URL
          },
        ];
      },
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('SMTP_HOST'),
          port: config.get('SMTP_PORT'),
          auth: {
            user: config.get('SMTP_USER'),
            pass: config.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: config.get('SMTP_FROM'),
        },
      }),
    }),

    // --- 4. Import các module nghiệp vụ & shared ---
    AuthModule,
    UsersModule,
    SharedModule,
  ],
  controllers: [AppController], // Controller cho health check (nếu có)
  providers: [AppService], // Không dùng global guard cho Throttler
})
export class AppModule {}
