// src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../users/entities/user.entity';
import { TeacherProfile } from '../users/entities/teacher-profile.entity';
import { SecurityAuditLog } from '../../shared/providers/audit/audit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TeacherProfile, SecurityAuditLog]),
    PrismaModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
