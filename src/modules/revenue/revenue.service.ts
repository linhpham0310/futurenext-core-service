import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [monthly, lastMonthly, total, monthlyCount] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: { status: 'COMPLETED', purchasedAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          status: 'COMPLETED',
          purchasedAt: { gte: lastMonthStart, lt: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.purchase.count({
        where: { status: 'COMPLETED', purchasedAt: { gte: monthStart } },
      }),
    ]);

    const monthlyAmount = monthly._sum.amount ?? 0;
    const lastMonthlyAmount = lastMonthly._sum.amount ?? 0;
    const growthPercent =
      lastMonthlyAmount === 0
        ? monthlyAmount > 0
          ? 100
          : 0
        : ((monthlyAmount - lastMonthlyAmount) / lastMonthlyAmount) * 100;

    return {
      monthlyRevenue: monthlyAmount,
      totalRevenue: total._sum.amount ?? 0,
      monthlyTransactions: monthlyCount,
      growthPercent,
    };
  }

  async getAdminTransactions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { status: 'COMPLETED' },
        skip,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
        include: {
          course: { select: { title: true, instructorId: true } },
        },
      }),
      this.prisma.purchase.count({ where: { status: 'COMPLETED' } }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        userName: '',
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTeacherStats(teacherId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthly, total, monthlyCount] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: {
          status: 'COMPLETED',
          purchasedAt: { gte: monthStart },
          course: { instructorId: teacherId },
        },
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          status: 'COMPLETED',
          course: { instructorId: teacherId },
        },
        _sum: { amount: true },
      }),
      this.prisma.purchase.count({
        where: {
          status: 'COMPLETED',
          purchasedAt: { gte: monthStart },
          course: { instructorId: teacherId },
        },
      }),
    ]);

    return {
      monthlyRevenue: monthly._sum.amount ?? 0,
      totalRevenue: total._sum.amount ?? 0,
      monthlyTransactions: monthlyCount,
    };
  }

  async getTeacherTransactions(teacherId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where: {
          status: 'COMPLETED',
          course: { instructorId: teacherId },
        },
        skip,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
        include: {
          course: { select: { title: true } },
        },
      }),
      this.prisma.purchase.count({
        where: {
          status: 'COMPLETED',
          course: { instructorId: teacherId },
        },
      }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        userName: '',
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
