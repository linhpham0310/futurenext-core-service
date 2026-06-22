import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RevenueService } from './revenue.service';
import { PaginationQueryDto } from './dto/revenue-query.dto';

@Controller('revenue')
@UseGuards(JwtAuthGuard)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  // ==================== ADMIN ENDPOINTS ====================
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminStats() {
    return this.revenueService.getAdminStats();
  }

  @Get('admin/transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminTransactions(@Query() query: PaginationQueryDto) {
    return this.revenueService.getAdminTransactions(
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  // ==================== TEACHER ENDPOINTS ====================
  @Get('teacher/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async getTeacherStats(@Request() req) {
    const teacherId = req.user.sub;
    return this.revenueService.getTeacherStats(teacherId);
  }

  @Get('teacher/transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async getTeacherTransactions(
    @Request() req,
    @Query() query: PaginationQueryDto,
  ) {
    const teacherId = req.user.sub;
    return this.revenueService.getTeacherTransactions(
      teacherId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }
}
