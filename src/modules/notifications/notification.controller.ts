// src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { NotificationService } from './notification.service';

// ==================== STUDENT NOTIFICATION CONTROLLER ====================
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(@Request() req, @Query('limit') limit = 20) {
    return this.notificationService.getUserNotifications(req.user.sub, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.sub);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(id, req.user.sub);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }
}

// ==================== TEACHER NOTIFICATION CONTROLLER ====================
@Controller('teacher/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Request() req, @Query('limit') limit = 20) {
    return this.notificationService.getUserNotifications(req.user.sub, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.sub);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(id, req.user.sub);
  }

  @Patch('mark-all-read')
  async markAllRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }
}
