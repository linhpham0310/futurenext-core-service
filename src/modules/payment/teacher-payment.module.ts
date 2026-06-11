import { Module } from '@nestjs/common';
import { TeacherPaymentController } from './teacher-payment.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherPaymentController],
})
export class TeacherPaymentModule {}
