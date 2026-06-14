// src/modules/announcement/announcement.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

@Controller('teacher/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  async getMyAnnouncements(@Request() req) {
    const teacherId = req.user.sub;
    return this.announcementService.getByTeacher(teacherId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAnnouncement(
    @Request() req,
    @Body() createDto: CreateAnnouncementDto,
  ) {
    const teacherId = req.user.sub;
    return this.announcementService.create(
      teacherId,
      createDto.courseId,
      createDto.title,
      createDto.content,
    );
  }
}
