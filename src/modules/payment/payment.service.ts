import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { VnpayService } from './vnpay.service';
import { QrService } from './qr.service';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private vnpayService: VnpayService,
    private qrService: QrService,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.logger.log('PaymentService initialized in MOCK mode');
  }
  async createCheckoutUrl(
    method: 'STRIPE' | 'VNPAY' | 'QR',
    orderCode: string,
    amount: number,
    title: string,
  ): Promise<{ paymentUrl: string | null; qrDataUrl: string | null }> {
    this.logger.log(`Mocking payment for order ${orderCode} via ${method}`);

    // Auto-confirm order for local development
    await this.confirmOrder(orderCode, 'MOCK_PAYMENT', 'mock_txn_id');

    // Return a URL that redirects back to the frontend success page
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
    const mockUrl = `${frontendUrl}/orders?payment=success`;

    return { paymentUrl: mockUrl, qrDataUrl: null };
  }

  private async createStripeCheckoutSession() {
    return 'http://localhost:3001/orders?payment=success';
  }

  async handleStripeWebhook(body: any, signature: string) {
    const endpointSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        endpointSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderCode = session.metadata?.orderCode;
      if (orderCode) {
        await this.confirmOrder(orderCode, 'STRIPE', session.id);
      }
    }
    return { received: true };
  }

  async handleVnpayWebhook(body: any): Promise<any> {
    const secretKey = this.configService.get('VNPAY_SECRET_KEY');
    const vnp_SecureHash = body.vnp_SecureHash;
    delete body.vnp_SecureHash;
    delete body.vnp_SecureHashType;

    const sortedKeys = Object.keys(body).sort();
    const signData = sortedKeys.map((key) => `${key}=${body[key]}`).join('&');
    const secureHash = crypto
      .createHmac('sha512', secretKey)
      .update(signData)
      .digest('hex');

    if (secureHash !== vnp_SecureHash) {
      throw new BadRequestException('Invalid VNPay signature');
    }

    const orderCode = body.vnp_TxnRef;
    const status = body.vnp_ResponseCode;
    if (status === '00') {
      await this.confirmOrder(orderCode, 'VNPAY', body.vnp_TransactionNo);
    }
    return { success: true };
  }

  /**
   * Xử lý webhook từ Casso (Webhook thường, xác thực bằng header secure-token).
   * Payload Casso: { data: [{ tid, description, amount, when, bank_sub_acc_id }] }
   */
  async handleCassoWebhook(body: any, secureToken: string) {
    const expectedToken = this.configService.get('CASSO_SECURE_TOKEN');
    if (!expectedToken || secureToken !== expectedToken) {
      throw new BadRequestException('Invalid Casso secure token');
    }

    const transactions = body.data || [];
    for (const tx of transactions) {
      const match = (tx.description || '').match(/DH([A-Za-z0-9]{4,12})/i);
      if (!match) continue;
      const orderCode = match[1];

      const purchases = await this.prisma.purchase.findMany({
        where: { orderCode },
      });
      if (purchases.length === 0) continue;

      const expectedTotal = purchases.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      if (Number(tx.amount) < expectedTotal) {
        this.logger.warn(`Casso: số tiền không đủ cho orderCode ${orderCode}`);
        continue;
      }

      await this.confirmOrder(orderCode, 'QR', String(tx.tid));
    }

    return { success: true };
  }

  private async confirmOrder(
    orderCode: string,
    paymentMethod: string,
    paymentId: string,
  ) {
    const purchases = await this.prisma.purchase.findMany({
      where: { orderCode },
    });
    if (purchases.length === 0) {
      this.logger.warn(`Không tìm thấy purchase cho orderCode ${orderCode}`);
      return;
    }

    await this.prisma.purchase.updateMany({
      where: { orderCode },
      data: { status: 'COMPLETED', paymentMethod, paymentId },
    });

    for (const purchase of purchases) {
      const lessons = await this.prisma.lesson.findMany({
        where: { courseId: purchase.courseId },
        select: { id: true },
      });
      const existing = await this.prisma.learningProgress.findFirst({
        where: { userId: purchase.userId, courseId: purchase.courseId },
      });
      if (!existing && lessons.length) {
        await this.prisma.learningProgress.createMany({
          data: lessons.map((l) => ({
            userId: purchase.userId,
            courseId: purchase.courseId,
            lessonId: l.id,
            status: 'NOT_STARTED',
            lastPosition: 0,
          })),
          skipDuplicates: true,
        });
      }
    }

    this.logger.log(`Order ${orderCode} confirmed with ${paymentMethod}`);
  }

  // ===== TEACHER PAYMENT ACCOUNTS =====
  async getTeacherAccounts(teacherId: string) {
    return this.prisma.paymentAccount.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPaymentAccount(teacherId: string, dto: CreatePaymentAccountDto) {
    const count = await this.prisma.paymentAccount.count({
      where: { teacherId },
    });
    const isDefault = count === 0; // tài khoản đầu tiên là mặc định
    return this.prisma.paymentAccount.create({
      data: {
        teacherId,
        type: dto.type,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
        isDefault,
      },
    });
  }

  async deletePaymentAccount(teacherId: string, accountId: string) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { id: accountId, teacherId },
    });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản');
    if (account.isDefault) {
      throw new BadRequestException('Không thể xóa tài khoản mặc định');
    }
    return this.prisma.paymentAccount.delete({ where: { id: accountId } });
  }

  async setDefaultAccount(teacherId: string, accountId: string) {
    await this.prisma.$transaction([
      this.prisma.paymentAccount.updateMany({
        where: { teacherId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.paymentAccount.update({
        where: { id: accountId, teacherId },
        data: { isDefault: true },
      }),
    ]);
    return { success: true };
  }

  // ===== WITHDRAWALS =====
  async createWithdrawalRequest(
    teacherId: string,
    dto: CreateWithdrawalRequestDto,
  ) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { id: dto.accountId, teacherId },
    });
    if (!account)
      throw new NotFoundException('Tài khoản nhận tiền không hợp lệ');

    // Kiểm tra số dư khả dụng
    const balance = await this.getTeacherBalance(teacherId);
    if (dto.amount > balance) throw new BadRequestException('Số dư không đủ');

    return this.prisma.withdrawalRequest.create({
      data: {
        teacherId,
        accountId: dto.accountId,
        amount: dto.amount,
        status: 'PENDING',
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolder: account.accountHolder,
        requestedAt: new Date(),
      },
    });
  }

  async getTeacherWithdrawals(
    teacherId: string,
    query: { page: number; limit: number },
  ) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where: { teacherId },
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.withdrawalRequest.count({ where: { teacherId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Hàm getTeacherBalance (đã có hoặc cần thêm)
  async getTeacherBalance(teacherId: string): Promise<number> {
    // Tính tổng doanh thu - tổng đã rút - tổng đang xử lý
    const totalRevenue = await this.prisma.revenueTransaction.aggregate({
      _sum: { amount: true },
      where: { teacherId, status: 'SUCCESS' },
    });
    const revenue = Number(totalRevenue._sum.amount) || 0;

    const withdrawn = await this.prisma.withdrawalRequest.aggregate({
      _sum: { amount: true },
      where: { teacherId, status: { in: ['PROCESSING', 'COMPLETED'] } },
    });
    const withdrawnAmount = Number(withdrawn._sum.amount) || 0;

    const pending = await this.prisma.withdrawalRequest.aggregate({
      _sum: { amount: true },
      where: { teacherId, status: 'PENDING' },
    });
    const pendingAmount = Number(pending._sum.amount) || 0;

    return revenue - withdrawnAmount - pendingAmount;
  }

  // ===== ADMIN METHODS =====
  async getAdminOverview() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfPrevMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const revenueThisMonth = await this.prisma.purchase.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED', purchasedAt: { gte: firstDayOfMonth } },
    });
    const totalRevenue = Number(revenueThisMonth._sum.amount) || 0;

    const revenuePrevMonth = await this.prisma.purchase.aggregate({
      _sum: { amount: true },
      where: {
        status: 'COMPLETED',
        purchasedAt: { gte: firstDayOfPrevMonth, lt: firstDayOfMonth },
      },
    });
    const prevRevenue = Number(revenuePrevMonth._sum.amount) || 0;
    const growthPercent =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const txCount = await this.prisma.purchase.count({
      where: { status: 'COMPLETED', purchasedAt: { gte: firstDayOfMonth } },
    });
    const prevTxCount = await this.prisma.purchase.count({
      where: {
        status: 'COMPLETED',
        purchasedAt: { gte: firstDayOfPrevMonth, lt: firstDayOfMonth },
      },
    });
    const txGrowth =
      prevTxCount > 0 ? ((txCount - prevTxCount) / prevTxCount) * 100 : 0;

    const pendingWithdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
    });
    const pendingPayouts = pendingWithdrawals.reduce(
      (sum, w) => sum + Number(w.amount),
      0,
    );
    const pendingCount = pendingWithdrawals.length;

    const totalOrders = await this.prisma.purchase.count({
      where: { status: 'COMPLETED' },
    });
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAvgOrder =
      prevRevenue > 0 && prevTxCount > 0 ? prevRevenue / prevTxCount : 0;
    const aovGrowth =
      prevAvgOrder > 0
        ? ((avgOrderValue - prevAvgOrder) / prevAvgOrder) * 100
        : 0;

    return {
      totalRevenue: Math.round(totalRevenue),
      growthPercent: Math.round(growthPercent),
      transactions: txCount,
      transactionGrowth: Math.round(txGrowth),
      pendingPayouts: Math.round(pendingPayouts),
      pendingCount,
      averageOrderValue: Math.round(avgOrderValue),
      aovGrowth: Math.round(aovGrowth),
    };
  }

  async getMonthlyRevenue(year?: number) {
    const currentYear = year || new Date().getFullYear();
    const result: { month: string; revenue: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const start = new Date(currentYear, m - 1, 1);
      const end = new Date(currentYear, m, 1);
      const revenue = await this.prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED', purchasedAt: { gte: start, lt: end } },
      });
      const value = Number(revenue._sum.amount) || 0;
      result.push({ month: `T${m}`, revenue: Math.round(value / 1000000) });
    }
    return result;
  }

  async getAdminTransactions(query: any) {
    const { page = 1, limit = 10, q, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = { in: status.split(',') };
    if (q) {
      where.OR = [
        { orderCode: { contains: q, mode: 'insensitive' } },
        { course: { title: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: {
          course: { select: { title: true } },
        },
        skip,
        take: +limit,
        orderBy: { purchasedAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    const userIds = [...new Set(items.map((p) => p.userId))];
    const users = userIds.length
      ? await this.entityManager.find(User, {
          where: { id: In(userIds) },
          select: ['id', 'fullName'],
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    const mapped = items.map((p) => ({
      id: p.id,
      code: p.orderCode || `TXN-${p.id.slice(0, 8)}`,
      studentName: userMap.get(p.userId) || 'Unknown',
      courseTitle: p.course.title,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod || 'Không rõ',
      status: p.status,
      createdAt: p.purchasedAt,
    }));
    return {
      items: mapped,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    };
    s;
  }

  async getWithdrawalRequests(query: any) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = { in: status.split(',') };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    const teacherIds = [...new Set(items.map((w) => w.teacherId))];
    const teachers = teacherIds.length
      ? await this.entityManager.find(User, {
          where: { id: In(teacherIds) },
          select: ['id', 'fullName'],
        })
      : [];
    const teacherMap = new Map(teachers.map((t) => [t.id, t.fullName]));

    const mapped = await Promise.all(
      items.map(async (w) => {
        const courseCount = await this.prisma.course.count({
          where: { instructorId: w.teacherId },
        });
        const studentCount = await this.prisma.purchase.count({
          where: {
            course: { instructorId: w.teacherId },
            status: 'COMPLETED',
          },
          distinct: ['userId'],
        });
        return {
          id: w.id,
          teacherId: w.teacherId,
          teacherName: teacherMap.get(w.teacherId) || 'Unknown',
          bankName: w.bankName || '',
          accountNumber: w.accountNumber || '',
          amount: Number(w.amount),
          status: w.status,
          requestedAt: w.requestedAt,
          courseCount,
          studentCount,
        };
      }),
    );

    return {
      items: mapped,
      total,
      page: +page,
      limit: +limit,
      totalPages: Math.ceil(total / +limit),
    };
  }

  async approveWithdrawal(requestId: string, adminId: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
    if (request.status !== 'PENDING')
      throw new BadRequestException('Yêu cầu đã được xử lý');

    return this.prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
        processedBy: adminId,
      },
    });
  }

  async rejectWithdrawal(requestId: string, adminId: string, reason: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
    if (request.status !== 'PENDING')
      throw new BadRequestException('Yêu cầu đã được xử lý');

    return this.prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        processedBy: adminId,
        rejectionReason: reason,
      },
    });
  }
}
