import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AdminOrderService {
  constructor(
    private prisma: PrismaService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getOrders(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: {
          course: { select: { title: true } },
        },
        skip,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    const userIds = [...new Set(items.map((p) => p.userId))];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      items: items.map((p) => {
        const user = userMap.get(p.userId);
        return {
          id: p.id,
          user: user ? { fullName: user.fullName, email: user.email } : null,
          course: p.course,
          amount: p.amount,
          status: p.status,
          paymentMethod: p.paymentMethod ?? 'UNKNOWN',
          createdAt: p.purchasedAt,
        };
      }),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.purchase.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    const user = await this.userRepo.findOne({ where: { id: order.userId } });

    return {
      ...order,
      user: user ? { fullName: user.fullName, email: user.email } : null,
    };
  }
}
