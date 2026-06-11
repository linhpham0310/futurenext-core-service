import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RevenueService } from './revenue.service';

@Controller('admin/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminRevenueController {
  constructor(private revenueService: RevenueService) {}

  @Get('stats')
  async getStats() {
    return this.revenueService.getStats();
  }

  @Get('transactions')
  async getTransactions() {
    return this.revenueService.getTransactions();
  }
}
