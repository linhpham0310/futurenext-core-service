import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';
import { CreateNotificationDto } from '../notifications/dto/CreateNotificationDto';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getAll(@Query('limit') limit = 50) {
    return this.notificationService.getAll(Number(limit));
  }

  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.createForAudience(dto);
  }
}
