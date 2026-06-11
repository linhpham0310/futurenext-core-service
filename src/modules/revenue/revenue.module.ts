import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminRevenueController } from './admin-revenue.controller';
import { TeacherRevenueController } from './teacher-revenue.controller';
import { RevenueService } from './revenue.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminRevenueController, TeacherRevenueController],
  providers: [RevenueService],
})
export class RevenueModule {}
