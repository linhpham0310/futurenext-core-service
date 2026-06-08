import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { UserRole } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class ReportController {
  constructor(private prisma: PrismaService) {}

  @Get('revenue/export')
  async exportRevenue(@Request() req, @Res() res: Response) {
    const teacherId = req.user.sub;
    const courses = await this.prisma.course.findMany({
      where: { instructorId: teacherId },
      select: { id: true, title: true },
    });
    const purchases = await this.prisma.purchase.findMany({
      where: {
        courseId: { in: courses.map((c) => c.id) },
        status: 'COMPLETED',
      },
      include: { user: true, course: true },
      orderBy: { purchasedAt: 'desc' },
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Doanh thu');
    worksheet.columns = [
      { header: 'Học viên', key: 'student', width: 30 },
      { header: 'Khóa học', key: 'course', width: 40 },
      { header: 'Số tiền (VNĐ)', key: 'amount', width: 15 },
      { header: 'Ngày mua', key: 'date', width: 20 },
    ];
    purchases.forEach((p) => {
      worksheet.addRow({
        student: p.user.fullName,
        course: p.course.title,
        amount: p.amount,
        date: p.purchasedAt.toLocaleDateString('vi-VN'),
      });
    });
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
    const teacherId = req.user.sub;
    const courses = await this.prisma.course.findMany({
      where: { instructorId: teacherId },
      select: { id: true },
    });
    const purchases = await this.prisma.purchase.findMany({
      where: {
        courseId: { in: courses.map((c) => c.id) },
        status: 'COMPLETED',
      },
      include: { user: true, course: true },
      distinct: ['userId'],
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Học viên');
    worksheet.columns = [
      { header: 'Họ tên', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Số điện thoại', key: 'phone', width: 20 },
      { header: 'Ngày đăng ký', key: 'joined', width: 20 },
    ];
    purchases.forEach((p) => {
      worksheet.addRow({
        name: p.user.fullName,
        email: p.user.email,
        phone: p.user.phone || '',
        joined: p.purchasedAt.toLocaleDateString('vi-VN'),
      });
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}
