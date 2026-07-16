import {
  Controller,
  Get,
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

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('overview')
  async getOverview() {
    return this.paymentService.getAdminOverview();
  }

  @Get('monthly-revenue')
  async getMonthlyRevenue(@Query('year') year?: string) {
    return this.paymentService.getMonthlyRevenue(
      year ? parseInt(year) : undefined,
    );
  }

  @Get('transactions')
  async getTransactions(@Query() query: any) {
    return this.paymentService.getAdminTransactions(query);
  }

  @Get('withdrawals')
  async getWithdrawals(@Query() query: any) {
    return this.paymentService.getWithdrawalRequests(query);
  }

  @Patch('withdrawals/:id/approve')
  async approveWithdrawal(@Param('id') id: string, @Request() req) {
    return this.paymentService.approveWithdrawal(id, req.user.sub);
  }

  @Patch('withdrawals/:id/reject')
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.paymentService.rejectWithdrawal(id, req.user.sub, reason);
  }
}
