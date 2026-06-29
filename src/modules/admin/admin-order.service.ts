import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AdminOrderService {
  constructor(private prisma: PrismaService) {}

  async getOrders(query: any) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: {
          user: { select: { fullName: true, email: true } },
          course: { select: { title: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { purchasedAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        user: p.user,
        course: p.course,
        amount: p.amount,
        status: p.status,
        paymentMethod: 'UNKNOWN', // có thể map từ metadata nếu có
        createdAt: p.purchasedAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        user: true,
        course: true,
      },
    });
    if (!order) throw new Error('Order not found');
    return order;
  }
}
