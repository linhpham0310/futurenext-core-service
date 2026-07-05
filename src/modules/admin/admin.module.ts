import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { NotificationService } from '../notifications/notification.service';
import { AdminNotificationController } from './admin-notification.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminOrderController } from './admin-order.controller';
import {
  AdminCategoryController,
  CategoriesController,
} from './admin-category.controller';
import { AdminCertificateController } from './admin-certificate.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminOrderService } from './admin-order.service';
import { AdminCategoryService } from './admin-category.service';
import { SupabaseStorageModule } from '../storage/supabase-storage.module';
import { StorageService } from '../storage/storage.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { CertificateModule } from '../certificate/certificate.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    PrismaModule,
    SupabaseStorageModule,
    CertificateModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [
    AdminNotificationController,
    AdminSettingsController,
    AdminOrderController,
    AdminCategoryController,
    AdminCertificateController,
    CategoriesController,
  ],
  providers: [
    NotificationService,
    AdminSettingsService,
    AdminOrderService,
    AdminCategoryService,
    {
      provide: StorageService,
      useClass: SupabaseStorageService,
    },
  ],
})
export class AdminModule {}
