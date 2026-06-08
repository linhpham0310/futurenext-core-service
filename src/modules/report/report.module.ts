import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportController],
})
export class ReportModule {}
