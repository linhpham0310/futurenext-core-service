import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('teacher/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherNotificationController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getNotifications(@Request() req, @Query('limit') limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.prisma.notification.count({
      where: { userId: req.user.sub, isRead: false },
    });
    return { count };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    await this.prisma.notification.updateMany({
      where: { id, userId: req.user.sub },
      data: { isRead: true },
    });
    return { message: 'Marked as read' };
  }

  @Patch('mark-all-read')
  async markAllRead(@Request() req) {
    await this.prisma.notification.updateMany({
      where: { userId: req.user.sub, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All marked as read' };
  }
}
