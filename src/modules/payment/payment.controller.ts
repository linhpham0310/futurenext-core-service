import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaymentService } from './payment.service';
import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';

@Controller('teacher/payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async getSettings(@Request() req) {
    return this.paymentService.getSettings(req.user.sub);
  }

  @Put()
  async updateSettings(@Request() req, @Body() dto: UpdatePaymentSettingDto) {
    return this.paymentService.updateSettings(req.user.sub, dto);
  }
}
