import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
})
export class AnnouncementModule {}
