import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TeacherPaymentController } from './teacher-payment.controller';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController, TeacherPaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
