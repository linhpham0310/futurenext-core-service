import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { NotificationService } from '../notifications/notification.service';
import { CertificateService } from '../certificate/certificate.service';
import { AdminNotificationController } from './admin-notification.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminOrderController } from './admin-order.controller';
import { AdminCategoryController } from './admin-category.controller';
import { AdminCertificateController } from './admin-certificate.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminOrderService } from './admin-order.service';
import { AdminCategoryService } from './admin-category.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminNotificationController,
    AdminSettingsController,
    AdminOrderController,
    AdminCategoryController,
    AdminCertificateController,
  ],
  providers: [
    NotificationService,
    CertificateService,
    AdminSettingsService,
    AdminOrderService,
    AdminCategoryService,
  ],
})
export class AdminModule {}
