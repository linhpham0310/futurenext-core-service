import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('settings')
  async getSettings(@Request() req) {
    return this.paymentService.getSettings(req.user.sub);
  }

  @Put('settings')
  async updateSettings(@Request() req, @Body() data: any) {
    return this.paymentService.updateSettings(req.user.sub, data);
  }
}
