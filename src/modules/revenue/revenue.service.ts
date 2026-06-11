import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RevenueService {
  constructor(private prisma: PrismaService) {}

  async getStats(teacherId?: string) {
    const where = teacherId
      ? { teacherId, status: 'SUCCESS' }
      : { status: 'SUCCESS' };
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthFirstDay = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const monthlyRevenueAgg = await this.prisma.revenueTransaction.aggregate({
      _sum: { amount: true },
      where: { ...where, createdAt: { gte: firstDayOfMonth } },
    });
    const totalRevenueAgg = await this.prisma.revenueTransaction.aggregate({
      _sum: { amount: true },
      where,
    });
    const monthlyTransactions = await this.prisma.revenueTransaction.count({
      where: { ...where, createdAt: { gte: firstDayOfMonth } },
    });
    const lastMonthRevenueAgg = await this.prisma.revenueTransaction.aggregate({
      _sum: { amount: true },
      where: {
        ...where,
        createdAt: { gte: lastMonthFirstDay, lt: firstDayOfMonth },
      },
    });
    const currentMonthRevenue = monthlyRevenueAgg._sum.amount || 0;
    const lastMonthRevenue = lastMonthRevenueAgg._sum.amount || 0;
    const growthPercent =
      lastMonthRevenue === 0
        ? currentMonthRevenue > 0
          ? 100
          : 0
        : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    return {
      monthlyRevenue: currentMonthRevenue,
      totalRevenue: totalRevenueAgg._sum.amount || 0,
      monthlyTransactions,
      growthPercent: Math.round(growthPercent),
    };
  }

  async getTransactions(teacherId?: string, limit = 20) {
    const where = teacherId
      ? { teacherId, status: 'SUCCESS' }
      : { status: 'SUCCESS' };
    return this.prisma.revenueTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        course: { select: { title: true } },
        user: { select: { fullName: true } },
      },
    });
  }
}
