import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { PrismaService } from 'prisma/prisma.service';
import { CourseOwnershipGuard } from './guards/course-ownership.guard';
import { CourseEventListener } from './listeners/course-event.listener';
import { CacheManagerListener } from './listeners/cache-manager.listener'; // (NEW - S4-CM-04)
import { SupabaseStorageModule } from '../storage/supabase-storage.module';

@Module({
  imports: [SupabaseStorageModule],
  controllers: [CourseController],
  providers: [
    CourseService,
    PrismaService,
    CourseOwnershipGuard,
    CourseEventListener,
    CacheManagerListener,
  ],
})
export class CourseModule {}
