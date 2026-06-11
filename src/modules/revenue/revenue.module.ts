import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RevenueController],
  providers: [RevenueService],
})
export class RevenueModule {}
