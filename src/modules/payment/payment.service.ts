import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: string) {
    return this.prisma.paymentSetting.findUnique({ where: { userId } });
  }

  async updateSettings(
    userId: string,
    data: { bankName: string; bankAccount: string; accountHolder: string },
  ) {
    return this.prisma.paymentSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
