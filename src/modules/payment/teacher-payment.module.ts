import { Module } from '@nestjs/common';
import { TeacherPaymentController } from './teacher-payment.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PaymentService } from './payment.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherPaymentController],
  providers: [PaymentService],
})
export class TeacherPaymentModule {}
