import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ReportService } from './report.service';
import { Response } from 'express';

@Controller('teacher/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherReportController {
  constructor(private reportService: ReportService) {}

  @Get(':type/export')
  async export(
    @Param('type') type: string,
    @Request() req,
    @Res() res: Response,
  ) {
    let workbook;
    if (type === 'revenue') {
      workbook = await this.reportService.exportRevenue(req.user.sub);
      res.setHeader('Content-Disposition', 'attachment; filename=revenue.xlsx');
    } else if (type === 'students') {
      workbook = await this.reportService.exportStudents(req.user.sub);
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=students.xlsx',
      );
    } else {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    await workbook.xlsx.write(res);
    res.end();
  }
}
