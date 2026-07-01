import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';

@Injectable()
export class PaymentSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: string) {
    const setting = await this.prisma.paymentSetting.findUnique({
      where: { userId },
    });
    if (!setting) {
      return { bankName: '', bankAccount: '', accountHolder: '' };
    }
    return setting;
  }

  async updateSettings(userId: string, dto: UpdatePaymentSettingDto) {
    return this.prisma.paymentSetting.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }
}
