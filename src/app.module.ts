// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER } from '@nestjs/core';
import { RedisModule } from '@nestjs-modules/ioredis'; // ← thêm

import { SharedModule } from './shared/shared.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CourseModule } from './modules/course/course.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ExamModule } from './modules/exam/exam.module';
import { LxModule } from './modules/lx/lx.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { SearchModule } from './modules/search/search.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { SupabaseStorageModule } from './modules/storage/supabase-storage.module';
import { ReportModule } from './modules/report/report.module';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './modules/auth/controllers/auth.controller';
import { AuthService } from './modules/auth/services/auth.service';
import { GoogleStrategy } from './modules/auth/strategies/google.strategy';
import { FacebookStrategy } from './modules/auth/strategies/facebook.strategy';
import { AppleStrategy } from './modules/auth/strategies/apple.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisModule.forRootAsync({
      // ← thêm block này
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.getOrThrow('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    SharedModule,
    AuthModule,
    UsersModule,
    CourseModule,
    PaymentModule,
    ExamModule,
    LxModule,
    NotificationsModule,
    ReportModule,
    RevenueModule,
    SearchModule,
    DashboardModule,
    AnnouncementModule,
    CertificateModule,
    SupabaseStorageModule,
  ],
  controllers: [AuthController],

  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    GoogleStrategy,
    AppleStrategy,
    FacebookStrategy,
  ],
  exports: [AuthService],
})
export class AppModule {}
