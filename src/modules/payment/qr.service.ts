// qr.service.ts
import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QrService {
  constructor(private configService: ConfigService) {}

  async generateQR(orderId: string, amount: number): Promise<string> {
    const bankInfo = {
      bankName: this.configService.get('QR_BANK_NAME', 'Vietcombank'),
      accountNumber: this.configService.get('QR_ACCOUNT_NUMBER', '1234567890'),
      accountName: this.configService.get('QR_ACCOUNT_NAME', 'FutureNext'),
      amount: amount,
      orderId: orderId,
    };
    const content = `Chuyen khoan: ${bankInfo.bankName} - ${bankInfo.accountNumber} - ${bankInfo.accountName} - So tien: ${amount} - Noi dung: ${orderId}`;
    return QRCode.toDataURL(content);
  }
}
