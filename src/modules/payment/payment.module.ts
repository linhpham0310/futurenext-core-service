import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TeacherPaymentController } from './teacher-payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherPaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
