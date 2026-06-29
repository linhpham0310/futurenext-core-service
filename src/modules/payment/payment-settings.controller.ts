import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaymentSettingsService } from './payment-settings.service';
import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';

@Controller('teacher/payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class PaymentSettingsController {
  constructor(
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {}

  @Get()
  async getSettings(@Request() req) {
    return this.paymentSettingsService.getSettings(req.user.sub);
  }

  @Put()
  async updateSettings(@Request() req, @Body() dto: UpdatePaymentSettingDto) {
    return this.paymentSettingsService.updateSettings(req.user.sub, dto);
  }
}
