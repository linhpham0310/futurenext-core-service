import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnnouncementService } from './announcement.service';

@Controller('teacher/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherAnnouncementController {
  constructor(private announcementService: AnnouncementService) {}

  @Get()
  async getMyAnnouncements(@Request() req) {
    return this.announcementService.getByTeacher(req.user.sub);
  }

  @Post()
  async create(
    @Request() req,
    @Body() body: { courseId: string; title: string; content: string },
  ) {
    return this.announcementService.create(
      req.user.sub,
      body.courseId,
      body.title,
      body.content,
    );
  }
}
