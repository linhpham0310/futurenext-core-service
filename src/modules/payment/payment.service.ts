import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { VnpayService } from './vnpay.service';
import { QrService } from './qr.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private vnpayService: VnpayService,
    private qrService: QrService,
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
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
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
}
