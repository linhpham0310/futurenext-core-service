import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaymentService } from './payment.service';
import { UpdatePaymentSettingDto } from './dto/update-payment-setting.dto';

@Controller('teacher/payment-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherPaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get()
  async get(@Request() req) {
    return this.paymentService.getSettings(req.user.sub);
  }

  @Put()
  async update(@Request() req, @Body() dto: UpdatePaymentSettingDto) {
    return this.paymentService.updateSettings(req.user.sub, dto);
  }
}
