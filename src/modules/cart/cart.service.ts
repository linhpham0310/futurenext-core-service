import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { course: true },
    });
    return items.map((item) => ({
      courseId: item.courseId,
      title: item.course.title,
      price: Number(item.course.price),
      thumbnail: item.course.thumbnailUrl,
      originalPrice: Number(item.course.price) * 1.3, // giả định, có thể lấy từ metadata
    }));
  }

  async getCartSummary(userId: string) {
    const items = await this.getCart(userId);
    const total = items.reduce((sum, item) => sum + item.price, 0);
    return { items, total };
  }

  async addToCart(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId, status: 'APPROVED' },
    });
    if (!course)
      throw new NotFoundException('Khóa học không tồn tại hoặc chưa xuất bản');

    // Kiểm tra đã sở hữu chưa
    const owned = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (owned) throw new BadRequestException('Bạn đã sở hữu khóa học này');

    return this.prisma.cartItem.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId },
    });
  }

  async removeFromCart(userId: string, courseId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { userId, courseId },
    });
  }

  async clearCart(userId: string) {
    return this.prisma.cartItem.deleteMany({ where: { userId } });
  }
}
