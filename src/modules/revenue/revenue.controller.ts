import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RevenueService } from './revenue.service';

@Controller('revenue')
@UseGuards(JwtAuthGuard)
export class RevenueController {
  constructor(private revenueService: RevenueService) {}

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminStats() {
    return this.revenueService.getAdminStats();
  }

  @Get('admin/transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.revenueService.getAdminTransactions(+page, +limit);
  }

  @Get('teacher/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async getTeacherStats(@Request() req) {
    return this.revenueService.getTeacherStats(req.user.sub);
  }

  @Get('teacher/transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async getTeacherTransactions(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.revenueService.getTeacherTransactions(
      req.user.sub,
      +page,
      +limit,
    );
  }
}
