// src/modules/payment/vnpay.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class VnpayService {
  constructor(private configService: ConfigService) {}

  createPaymentUrl(orderCode: string, amount: number): string {
    const vnp_Version = '2.1.0';
    const vnp_Command = 'pay';
    const vnp_TmnCode = this.configService.get('VNPAY_MERCHANT_ID');
    const vnp_Amount = amount * 100; // VNPay yêu cầu nhân 100
    const vnp_CurrCode = 'VND';
    const vnp_TxnRef = orderCode;
    const vnp_OrderInfo = `Thanh toan don hang ${orderCode}`;
    const vnp_OrderType = 'billpayment';
    const vnp_Locale = 'vn';
    const vnp_ReturnUrl = `${this.configService.get('APP_URL')}/payment/vnpay/return`;
    const vnp_IpAddr = '127.0.0.1';
    const vnp_CreateDate = new Date()
      .toISOString()
      .replace(/[-:.]/g, '')
      .slice(0, 14);

    const params = {
      vnp_Version,
      vnp_Command,
      vnp_TmnCode,
      vnp_Amount,
      vnp_CurrCode,
      vnp_TxnRef,
      vnp_OrderInfo,
      vnp_OrderType,
      vnp_Locale,
      vnp_ReturnUrl,
      vnp_IpAddr,
      vnp_CreateDate,
    };

    const sortedKeys = Object.keys(params).sort();
    const secretKey = this.configService.get<string>('VNPAY_SECRET_KEY');
    if (!secretKey) throw new Error('VNPAY_SECRET_KEY is not defined');
    const signData = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');
    const secureHash = crypto
      .createHmac('sha512', secretKey)
      .update(signData)
      .digest('hex');

    const queryString = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${queryString}&vnp_SecureHash=${secureHash}`;
  }

  verifyPayment(params: any): boolean {
    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sortedKeys = Object.keys(params).sort();
    const secretKey = this.configService.get<string>('VNPAY_SECRET_KEY');
    if (!secretKey) throw new Error('VNPAY_SECRET_KEY is not defined');
    const signData = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(signData)
      .digest('hex');

    return hash === secureHash;
  }
}
