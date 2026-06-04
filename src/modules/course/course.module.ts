import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { PrismaService } from 'prisma/prisma.service';
import { CourseOwnershipGuard } from './guards/course-ownership.guard';
import { CourseEventListener } from './listeners/course-event.listener';
import { S3Service } from '../common/s3.service';
import { CacheManagerListener } from './listeners/cache-manager.listener'; // (NEW - S4-CM-04)

@Module({
  imports: [],
  controllers: [CourseController],
  providers: [
    CourseService,
    PrismaService,
    CourseOwnershipGuard,
    CourseEventListener,
    S3Service,
    CacheManagerListener, // Đăng ký Listener mới tại đây
  ],
})
export class CourseModule {}
