import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentSettingsController } from './payment-settings.controller';
import { VnpayService } from './vnpay.service';
import { QrService } from './qr.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController, PaymentSettingsController],
  providers: [PaymentService, PaymentSettingsService, VnpayService, QrService],
  exports: [PaymentService],
})
export class PaymentModule {}
