import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ReportController, TeacherReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportController, TeacherReportController],
  providers: [ReportService],
})
export class ReportModule {}
