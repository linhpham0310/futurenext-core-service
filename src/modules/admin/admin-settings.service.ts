import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.systemSetting.findMany();
    const result: Record<string, any> = {
      general: {},
      payment: {},
      email: {},
      ai: {},
    };

    settings.forEach((s) => {
      const key = s.key as string;
      if (key.startsWith('general.')) {
        result.general[key.replace('general.', '')] = s.value;
      } else if (key.startsWith('payment.')) {
        result.payment[key.replace('payment.', '')] = s.value;
      } else if (key.startsWith('email.')) {
        result.email[key.replace('email.', '')] = s.value;
      } else if (key.startsWith('ai.')) {
        result.ai[key.replace('ai.', '')] = s.value;
      } else {
        result[key] = s.value;
      }
    });

    // Trả về đúng cấu trúc frontend mong đợi
    return {
      siteName: result['general.siteName'] || 'FutureNext.ai',
      supportEmail: result['general.supportEmail'] || 'support@futurenext.ai',
      currency: result['general.currency'] || 'VND',
      defaultLanguage: result['general.defaultLanguage'] || 'vi',
      stripeSecretKey: result['payment.stripeSecretKey'] || '',
      stripePublishableKey: result['payment.stripePublishableKey'] || '',
      vnpayMerchantId: result['payment.vnpayMerchantId'] || '',
      vnpaySecretKey: result['payment.vnpaySecretKey'] || '',
      smtpHost: result['email.smtpHost'] || '',
      smtpPort: result['email.smtpPort'] || 587,
      smtpUsername: result['email.smtpUsername'] || '',
      smtpPassword: result['email.smtpPassword'] || '',
      aiProvider: result['ai.aiProvider'] || 'none',
      aiApiKey: result['ai.aiApiKey'] || '',
      aiModel: result['ai.aiModel'] || 'gpt-4',
    };
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const updates = Object.entries(dto).map(([key, value]) =>
      this.prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.getSettings();
  }
}
