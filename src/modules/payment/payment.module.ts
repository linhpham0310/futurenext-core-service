import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentSettingsService } from './payment-settings.service';
import { PaymentSettingsController } from './payment-settings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController, PaymentSettingsController],
  providers: [PaymentService, PaymentSettingsService],
  exports: [PaymentService],
})
export class PaymentModule {}
