import { Controller, Post, Req, Res, Body, RawBody } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from 'prisma/prisma.service';

@Controller('payments')
export class PaymentWebhookController {
  constructor(private prisma: PrismaService) {}

  @Post('stripe/webhook')
  async stripeWebhook(@Req() req: Request, @Res() res: Response) {
    // Xử lý webhook Stripe
    const sig = req.headers['stripe-signature'] as string;
    // Verify signature, parse event
    // Cập nhật order status
    res.json({ received: true });
  }

  @Post('vnpay/webhook')
  async vnpayWebhook(@Req() req: Request, @Res() res: Response) {
    // Xử lý webhook VNPay
    res.json({ received: true });
  }

  @Post('qr/webhook')
  async qrWebhook(@Req() req: Request, @Res() res: Response) {
    // Xử lý webhook QR
    res.json({ received: true });
  }
}
