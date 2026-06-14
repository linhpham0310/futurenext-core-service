import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ReportService } from './report.service';

// ==================== CONTROLLER 1: /reports (giữ nguyên route cũ) ====================
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('revenue/export')
  async exportRevenue(@Request() req, @Res() res: Response) {
    const workbook = await this.reportService.exportRevenue(req.user.sub);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=revenue.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('students/export')
  async exportStudents(@Request() req, @Res() res: Response) {
    const workbook = await this.reportService.exportStudents(req.user.sub);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}

// ==================== CONTROLLER 2: /teacher/reports (route mới gọn hơn) ====================
@Controller('teacher/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(':type/export')
  async export(
    @Param('type') type: string,
    @Request() req,
    @Res() res: Response,
  ) {
    let workbook;
    let filename;
    if (type === 'revenue') {
      workbook = await this.reportService.exportRevenue(req.user.sub);
      filename = 'revenue.xlsx';
    } else if (type === 'students') {
      workbook = await this.reportService.exportStudents(req.user.sub);
      filename = 'students.xlsx';
    } else {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  }
}
