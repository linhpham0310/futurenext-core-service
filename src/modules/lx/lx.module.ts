// lx.module.ts
import { Module } from '@nestjs/common';
import { LxService } from './lx.service';
import { LxController } from './lx.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { CourseEntitlementGuard } from './guards/course-entitlement.guard';

@Module({
  imports: [PrismaModule],
  controllers: [LxController],
  providers: [LxService, CourseEntitlementGuard],
  exports: [LxService],
})
export class LxModule {}
