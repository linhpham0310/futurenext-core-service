import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaymentService } from './payment.service';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';

@Controller('teacher/payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherPaymentController {
  constructor(private paymentService: PaymentService) {}

  // ===== ACCOUNTS =====
  @Get('accounts')
  async getAccounts(@Request() req) {
    return this.paymentService.getTeacherAccounts(req.user.sub);
  }

  @Post('accounts')
  async createAccount(@Request() req, @Body() dto: CreatePaymentAccountDto) {
    return this.paymentService.createPaymentAccount(req.user.sub, dto);
  }

  @Delete('accounts/:id')
  async deleteAccount(@Param('id') id: string, @Request() req) {
    return this.paymentService.deletePaymentAccount(req.user.sub, id);
  }

  @Patch('accounts/:id/default')
  async setDefault(@Param('id') id: string, @Request() req) {
    return this.paymentService.setDefaultAccount(req.user.sub, id);
  }

  // ===== WITHDRAWALS =====
  @Post('withdrawals')
  async createWithdrawal(
    @Request() req,
    @Body() dto: CreateWithdrawalRequestDto,
  ) {
    return this.paymentService.createWithdrawalRequest(req.user.sub, dto);
  }

  @Get('withdrawals/history')
  async getWithdrawalHistory(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getTeacherWithdrawals(req.user.sub, {
      page: +page,
      limit: +limit,
    });
  }
}
