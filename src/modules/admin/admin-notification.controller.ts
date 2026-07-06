import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';
import { CreateNotificationDto } from '../notifications/dto/create-notification.dto';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const [data, total] = await Promise.all([
      this.notificationService.getAllPaginated(pageNum, limitNum),
      this.notificationService.countAll(),
    ]);
    return {
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.createNotification(dto);
  }
}
