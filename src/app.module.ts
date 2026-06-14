// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { SharedModule } from './shared/shared.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';

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

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
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
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
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
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
