import { Module } from '@nestjs/common';
import { TeacherAnnouncementController } from './announcement.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherAnnouncementController],
})
export class AnnouncementModule {}
