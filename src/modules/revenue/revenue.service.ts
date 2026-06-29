// revenue.service.ts
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
        ? Number(monthlyAmount) > 0
          ? 100
          : 0
        : ((Number(monthlyAmount) - Number(lastMonthlyAmount)) /
            Number(lastMonthlyAmount)) *
          100;

    return {
      monthlyRevenue: Number(monthlyAmount),
      totalRevenue: Number(total._sum.amount ?? 0),
      monthlyTransactions: monthlyCount,
      growthPercent: Math.round(growthPercent * 100) / 100,
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

    // FIX: dùng raw query lấy userName vì User ở schema public (TypeORM)
    const userIds = [...new Set(items.map((p) => p.userId))];
    // Thay cả 2 chỗ trong revenue.service.ts

    const users =
      userIds.length > 0
        ? ((await this.prisma.$queryRawUnsafe(
            `SELECT id, "fullName" FROM "users" WHERE id = ANY($1::uuid[])`,
            userIds,
          )) as { id: string; fullName: string }[])
        : [];

    const userMap = new Map(users.map((u) => [u.id, u.fullName]));
    return {
      items: items.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: userMap.get(p.userId) ?? '',
        amount: Number(p.amount),
        type: 'PURCHASE', // field không có trong DB, hardcode là đúng
        status: 'SUCCESS', // status COMPLETED → hiển thị SUCCESS
        createdAt: p.purchasedAt,
        course: p.course,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTeacherStats(teacherId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [monthly, lastMonthly, total, monthlyCount] = await Promise.all([
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
          purchasedAt: { gte: lastMonthStart, lt: monthStart },
          course: { instructorId: teacherId },
        },
        _sum: { amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: { status: 'COMPLETED', course: { instructorId: teacherId } },
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

    const monthlyAmount = Number(monthly._sum.amount ?? 0);
    const lastMonthlyAmount = Number(lastMonthly._sum.amount ?? 0);
    const growthPercent =
      lastMonthlyAmount === 0
        ? monthlyAmount > 0
          ? 100
          : 0
        : ((monthlyAmount - lastMonthlyAmount) / lastMonthlyAmount) * 100;

    return {
      monthlyRevenue: monthlyAmount,
      totalRevenue: Number(total._sum.amount ?? 0),
      monthlyTransactions: monthlyCount,
      growthPercent: Math.round(growthPercent * 100) / 100,
    };
  }

  async getTeacherTransactions(teacherId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { status: 'COMPLETED', course: { instructorId: teacherId } },
        skip,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
        include: {
          course: { select: { title: true } },
        },
      }),
      this.prisma.purchase.count({
        where: { status: 'COMPLETED', course: { instructorId: teacherId } },
      }),
    ]);

    // FIX: raw query lấy userName
    const userIds = [...new Set(items.map((p) => p.userId))];
    // Thay cả 2 chỗ trong revenue.service.ts

    const users =
      userIds.length > 0
        ? ((await this.prisma.$queryRawUnsafe(
            `SELECT id, "fullName" FROM "users" WHERE id = ANY($1::uuid[])`,
            userIds,
          )) as { id: string; fullName: string }[])
        : [];

    const userMap = new Map(users.map((u) => [u.id, u.fullName]));
    return {
      items: items.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: userMap.get(p.userId) ?? '',
        amount: Number(p.amount),
        type: 'PURCHASE',
        status: 'SUCCESS',
        createdAt: p.purchasedAt,
        course: p.course,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
