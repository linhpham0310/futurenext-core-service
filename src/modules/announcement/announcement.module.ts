import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AnnouncementService } from './announcement.service';
import { TeacherAnnouncementController } from './teacher-announcement.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherAnnouncementController],
  providers: [AnnouncementService],
})
export class AnnouncementModule {}
