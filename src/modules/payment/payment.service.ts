import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables',
      );
    }
    this.stripe = new Stripe(secretKey);
  }

  async createStripeCheckoutSession(
    orderId: string,
    amount: number,
    courseTitle: string,
  ) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'vnd',
            product_data: { name: courseTitle },
            unit_amount: amount, // VND, Stripe tính bằng đơn vị nhỏ nhất (cent)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${this.configService.get('APP_URL')}/orders/${orderId}/success`,
      cancel_url: `${this.configService.get('APP_URL')}/orders/${orderId}/cancel`,
      metadata: { orderId },
    });

    return session.url;
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
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await this.confirmOrder(orderId, 'STRIPE', session.id);
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

    const orderId = body.vnp_TxnRef;
    const status = body.vnp_ResponseCode;
    if (status === '00') {
      await this.confirmOrder(orderId, 'VNPAY', body.vnp_TransactionNo);
    }
    return { success: true };
  }

  async handleQrWebhook(body: any): Promise<any> {
    const secretKey = this.configService.get('QR_WEBHOOK_SECRET');
    const signature = body.signature;
    const data = body.data;

    // Xác thực signature (giả định)
    if (
      signature !==
      crypto
        .createHmac('sha256', secretKey)
        .update(JSON.stringify(data))
        .digest('hex')
    ) {
      throw new BadRequestException('Invalid QR webhook signature');
    }

    const { orderId, status, transactionId } = data;
    if (status === 'SUCCESS') {
      await this.confirmOrder(orderId, 'QR', transactionId);
    }
    return { success: true };
  }

  private async confirmOrder(
    orderId: string,
    paymentMethod: string,
    paymentId: string,
  ) {
    await this.prisma.purchase.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        paymentMethod,
        // Có thể thêm trường paymentId nếu có
      },
    });
    // Tạo enrollment nếu chưa có
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: orderId },
    });
    if (purchase) {
      const existing = await this.prisma.learningProgress.findFirst({
        where: { userId: purchase.userId, courseId: purchase.courseId },
      });
      if (!existing) {
        // Tạo progress mặc định (có thể không cần)
      }
    }
    this.logger.log(`Order ${orderId} confirmed with ${paymentMethod}`);
  }
}
