// src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
