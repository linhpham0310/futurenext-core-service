import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '../users/entities/user.entity';

class PaymentSettingsDto {
  bankAccount: string;
  bankName: string;
  accountHolder: string;
}

@Controller('teacher/payment-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherPaymentController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSettings(@Request() req) {
    const settings = await this.prisma.teacherPaymentSettings.findUnique({
      where: { teacherId: req.user.sub },
    });
    return settings || null;
  }

  @Put()
  async updateSettings(@Request() req, @Body() dto: PaymentSettingsDto) {
    return this.prisma.teacherPaymentSettings.upsert({
      where: { teacherId: req.user.sub },
      update: dto,
      create: { teacherId: req.user.sub, ...dto },
    });
  }
}
