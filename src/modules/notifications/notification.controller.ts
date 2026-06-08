import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

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
