/**
 * @file Module definition for user-related features (profile, admin management, etc.).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';
import { UserConsent } from './entities/user-consent.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { TeacherProfilesController } from './controllers/teacher-profiles.controller';
import { TeacherProfilesService } from './services/teacher-profiles.service';
import { AdminTeacherProfilesController } from './controllers/admin-teacher-profiles.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UsersAdminController } from './controllers/users-admin.controller';
import { StudentController } from './controllers/student.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserCredential,
      UserConsent,
      TeacherProfile,
    ]),
    PrismaModule,
  ],
  controllers: [
    UsersController,
    UsersAdminController,
    TeacherProfilesController,
    AdminTeacherProfilesController,
    StudentController,
  ],
  providers: [UsersService, UsersAdminController, TeacherProfilesService],
  exports: [UsersService, TypeOrmModule, TeacherProfilesService],
})
export class UsersModule {}
