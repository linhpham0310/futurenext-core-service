import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RevenueService } from './revenue.service';

@Controller('teacher/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherRevenueController {
  constructor(private revenueService: RevenueService) {}

  @Get('stats')
  async getStats(@Request() req) {
    return this.revenueService.getStats(req.user.sub);
  }

  @Get('transactions')
  async getTransactions(@Request() req) {
    return this.revenueService.getTransactions(req.user.sub);
  }
}
