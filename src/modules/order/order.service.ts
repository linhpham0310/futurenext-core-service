import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { nanoid } from 'nanoid';
import { CartService } from '../cart/cart.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private paymentService: PaymentService,
  ) {}

  async createOrder(
    userId: string,
    data: { courseIds: string[]; paymentMethod: string; couponCode?: string },
  ) {
    const { courseIds, paymentMethod, couponCode } = data;
    const uniqueCourseIds = [...new Set(courseIds)];

    // Lấy thông tin khóa học
    const courses = await this.prisma.course.findMany({
      where: { id: { in: uniqueCourseIds }, status: 'APPROVED' },
    });
    if (courses.length !== uniqueCourseIds.length) {
      throw new BadRequestException(
        'Một số khóa học không tồn tại hoặc chưa xuất bản',
      );
    }

    // Phân loại free/paid
    const freeCourses = courses.filter((c) => Number(c.price) === 0);
    const paidCourses = courses.filter((c) => Number(c.price) > 0);

    // Xử lý free courses
    for (const course of freeCourses) {
      const existing = await this.prisma.purchase.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
      });
      if (!existing) {
        await this.prisma.purchase.create({
          data: {
            userId,
            courseId: course.id,
            amount: 0,
            status: 'COMPLETED',
            purchasedAt: new Date(),
            paymentMethod: 'FREE',
          },
        });
        await this.enrollExisting(userId, course.id);
      }
    }

    // Nếu chỉ có free courses
    if (paidCourses.length === 0) {
      await this.cartService.clearCart(userId);
      return { success: true, message: 'Đăng ký thành công!' };
    }

    // Kiểm tra đã sở hữu hoặc đang chờ
    const owned = await this.prisma.purchase.findMany({
      where: {
        userId,
        courseId: { in: paidCourses.map((c) => c.id) },
        status: { in: ['PENDING', 'COMPLETED'] },
      },
    });
    if (owned.length > 0) {
      const names = owned
        .map((p) => courses.find((c) => c.id === p.courseId)?.title)
        .join(', ');
      throw new ConflictException(
        `Bạn đã sở hữu hoặc có đơn đang xử lý cho: ${names}`,
      );
    }

    // Áp dụng mã giảm giá
    let discount = 0;
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode, isActive: true },
      });
      if (coupon && coupon.expiresAt > new Date()) {
        discount = coupon.discountValue;
        // Có thể là số tiền hoặc %
        if (coupon.type === 'PERCENT') {
          const total = paidCourses.reduce(
            (sum, c) => sum + Number(c.price),
            0,
          );
          discount = (total * discount) / 100;
        }
        // Giới hạn discount không vượt quá tổng
        const totalPaid = paidCourses.reduce(
          (sum, c) => sum + Number(c.price),
          0,
        );
        discount = Math.min(discount, totalPaid);
      }
    }

    // Tính tổng
    const total =
      paidCourses.reduce((sum, c) => sum + Number(c.price), 0) - discount;

    const orderCode = nanoid(8).toUpperCase();

    // Tạo purchase
    const purchases: any[] = [];

    for (const course of paidCourses) {
      const purchase = await this.prisma.purchase.create({
        data: {
          userId,
          courseId: course.id,
          amount: course.price, // lưu giá gốc, discount sẽ được áp dụng riêng
          status: 'PENDING',
          purchasedAt: new Date(),
          paymentMethod,
          orderCode,
          discount: discount > 0 ? discount / paidCourses.length : 0, // phân bổ đều
        },
      });
      purchases.push(purchase);
    }

    // Xóa cart
    await this.cartService.clearCart(userId);

    // Tạo payment URL (nếu có)
    let paymentUrl: string | null = null;
    let qrDataUrl: string | null = null;
    try {
      const result = await this.paymentService.createCheckoutUrl(
        paymentMethod as 'STRIPE' | 'VNPAY' | 'QR',
        orderCode,
        total,
        paidCourses.map((c) => c.title).join(', '),
      );
      paymentUrl = result.paymentUrl;
      qrDataUrl = result.qrDataUrl;
    } catch (err) {
      console.error('Lỗi tạo phiên thanh toán:', err);
    }

    return {
      orderId: purchases[0]?.id,
      orderIds: purchases.map((p) => p.id),
      orderCode,
      total,
      paymentUrl,
      qrDataUrl,
    };
  }

  private async enrollExisting(userId: string, courseId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    const existing = await this.prisma.learningProgress.findFirst({
      where: { userId, courseId },
    });
    if (!existing && lessons.length) {
      await this.prisma.learningProgress.createMany({
        data: lessons.map((l) => ({
          userId,
          courseId,
          lessonId: l.id,
          status: 'NOT_STARTED',
          lastPosition: 0,
        })),
        skipDuplicates: true,
      });
    }
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.purchase.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    // Nhóm theo orderCode
    const grouped = new Map();
    for (const o of orders) {
      const key = o.orderCode || o.id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          orderCode: o.orderCode,
          status: o.status,
          total: 0,
          createdAt: o.purchasedAt,
          paymentMethod: o.paymentMethod,
          items: [],
        });
      }
      const group = grouped.get(key);
      group.total += Number(o.amount);
      group.items.push({
        id: o.id,
        courseId: o.course.id,
        title: o.course.title,
        price: Number(o.amount),
        progress: 0, // sẽ tính sau
        isReviewed: false,
      });
    }

    const result = Array.from(grouped.values());
    // Tính tiến độ cho từng item
    for (const order of result) {
      for (const item of order.items) {
        const totalLessons = await this.prisma.lesson.count({
          where: { courseId: item.courseId },
        });
        const completed = await this.prisma.learningProgress.count({
          where: { userId, courseId: item.courseId, status: 'COMPLETED' },
        });
        item.progress =
          totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
        // Kiểm tra đã đánh giá chưa
        const review = await this.prisma.review.findFirst({
          where: { userId, courseId: item.courseId },
        });
        item.isReviewed = !!review;
      }
    }
    return result;
  }

  async getOrderDetail(userId: string, orderId: string) {
    const order = await this.prisma.purchase.findFirst({
      where: { id: orderId, userId },
      include: { course: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const totalLessons = await this.prisma.lesson.count({
      where: { courseId: order.courseId },
    });
    const completed = await this.prisma.learningProgress.count({
      where: { userId, courseId: order.courseId, status: 'COMPLETED' },
    });
    const progress =
      totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    return {
      ...order,
      amount: Number(order.amount),
      progress,
    };
  }

  async getOrderStatus(orderId: string) {
    const order = await this.prisma.purchase.findFirst({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return { status: order.status };
  }
}
