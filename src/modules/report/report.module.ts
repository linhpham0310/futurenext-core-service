import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TeacherReportController } from './teacher-report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherReportController],
  providers: [ReportService],
})
export class ReportModule {}
