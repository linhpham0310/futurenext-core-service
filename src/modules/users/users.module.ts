/**
 * @file Module definition for user-related features (profile, admin management, etc.).
 */
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './services/users.service';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';
import { UserConsent } from './entities/user-consent.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { TeacherProfilesService } from './services/teacher-profiles.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  UsersController,
  UsersAdminController,
  TeacherProfilesController,
  AdminTeacherProfilesController,
  StudentController,
} from './controllers/users.controller';
import { SecurityAuditLog } from '@/shared/providers/audit/audit.entity';
import { CodeRunnerModule } from '../code-runner/code-runner.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserCredential,
      UserConsent,
      TeacherProfile,
      SecurityAuditLog,
    ]),
    PrismaModule,
    forwardRef(() => AuthModule),
    CodeRunnerModule,
    AiModule,
  ],
  controllers: [
    UsersController,
    UsersAdminController,
    TeacherProfilesController,
    AdminTeacherProfilesController,
    StudentController,
  ],
  providers: [UsersService, TeacherProfilesService],
  exports: [UsersService, TypeOrmModule, TeacherProfilesService],
})
export class UsersModule {}
