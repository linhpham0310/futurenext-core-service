import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QrService {
  constructor(private configService: ConfigService) {}

  /**
   * Tạo URL ảnh QR chuẩn VietQR (NAPAS) — app ngân hàng quét vào sẽ tự điền
   * số tiền và nội dung chuyển khoản, không cần API key.
   */
  generateQR(orderCode: string, amount: number): string {
    const bankId = this.configService.get('QR_BANK_NAME', 'VCB');
    const accountNo = this.configService.get('QR_ACCOUNT_NUMBER');
    const accountName = this.configService.get('QR_ACCOUNT_NAME', 'FutureNext');
    const addInfo = encodeURIComponent(`DH${orderCode}`);
    const encodedName = encodeURIComponent(accountName);

    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${encodedName}`;
  }
}
