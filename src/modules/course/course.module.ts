// src/modules/course/course.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SupabaseStorageModule } from '../storage/supabase-storage.module'; // đường dẫn đúng
import { CourseService } from './course.service';
import { CourseOwnershipGuard } from './guards/course-ownership.guard';
import { CourseEventListener } from './listeners/course-event.listener';
import { CacheManagerListener } from './listeners/cache-manager.listener';
import {
  CourseController,
  TeacherCourseController,
  AdminCourseController,
} from './controllers/course.controller';
import { User } from '../users/entities/user.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PrismaModule,
    SupabaseStorageModule,
    AiModule,
  ],
  controllers: [
    CourseController,
    TeacherCourseController,
    AdminCourseController,
  ],
  providers: [
    CourseService,
    CourseOwnershipGuard,
    CourseEventListener,
    CacheManagerListener,
  ],
  exports: [CourseService],
})
export class CourseModule {}
