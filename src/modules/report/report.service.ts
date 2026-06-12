import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async exportRevenue(teacherId: string) {
    const transactions = await this.prisma.revenueTransaction.findMany({
      where: { teacherId, status: 'SUCCESS' },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Doanh thu');
    worksheet.columns = [
      { header: 'Mã GD', key: 'id', width: 10 },
      { header: 'Học viên', key: 'student', width: 20 },
      { header: 'Khóa học', key: 'course', width: 30 },
      { header: 'Số tiền', key: 'amount', width: 15 },
      { header: 'Ngày', key: 'date', width: 20 },
    ];
    transactions.forEach((tx) => {
      worksheet.addRow({
        id: tx.id,
        student: tx.user?.fullName || '',
        course: tx.course?.title || '',
        amount: tx.amount,
        date: tx.createdAt.toLocaleString('vi-VN'),
      });
    });
    return workbook;
  }

  async exportStudents(teacherId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { course: { instructorId: teacherId }, status: 'COMPLETED' },
      distinct: ['userId'],
      include: {
        user: { select: { fullName: true, email: true } },
        course: { select: { title: true } },
      },
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Học viên');
    worksheet.columns = [
      { header: 'Họ tên', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Khóa học', key: 'course', width: 30 },
      { header: 'Ngày đăng ký', key: 'date', width: 20 },
    ];
    purchases.forEach((p) => {
      worksheet.addRow({
        name: p.user.fullName,
        email: p.user.email,
        course: p.course.title,
        date: p.purchasedAt.toLocaleString('vi-VN'),
      });
    });
    return workbook;
  }
}
