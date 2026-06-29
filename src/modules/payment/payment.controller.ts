import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    const result = await this.paymentService.handleStripeWebhook(req.body, sig);
    return res.status(200).json(result);
  }

  @Post('vnpay/webhook')
  @HttpCode(HttpStatus.OK)
  async vnpayWebhook(@Body() body: any) {
    return this.paymentService.handleVnpayWebhook(body);
  }

  @Post('qr/webhook')
  @HttpCode(HttpStatus.OK)
  async qrWebhook(@Body() body: any) {
    return this.paymentService.handleQrWebhook(body);
  }
}
