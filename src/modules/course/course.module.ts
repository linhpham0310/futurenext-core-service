import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { PrismaService } from 'prisma/prisma.service';
import { CourseOwnershipGuard } from './guards/course-ownership.guard';
import { CourseEventListener } from './listeners/course-event.listener';
import { CacheManagerListener } from './listeners/cache-manager.listener'; // (NEW - S4-CM-04)
import { SupabaseStorageModule } from '../storage/supabase-storage.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AdminCourseController } from './controllers/admin-course.controller';
import { TeacherCourseController } from './controllers/teacher-course.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    SupabaseStorageModule,
    PrismaModule,
  ],
  controllers: [
    CourseController,
    AdminCourseController,
    TeacherCourseController,
  ],
  providers: [
    CourseService,
    PrismaService,
    CourseOwnershipGuard,
    CourseEventListener,
    CacheManagerListener,
  ],
  exports: [CourseService],
})
export class CourseModule {}
