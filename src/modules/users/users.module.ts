/**
 * @file Module definition for user-related features (profile, admin management, etc.).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller'; // Controller cho /me
// Import UsersAdminController nếu có
import { User } from './entities/user.entity'; // Import các entity liên quan
import { UserCredential } from './entities/user-credential.entity';
import { UserConsent } from './entities/user-consent.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
// AuthModule thường được import global hoặc trong AppModule, không cần import ở đây
// SharedModule cũng thường là global
import { UsersAdminController } from './users-admin.controller';
import { TeacherProfilesController } from './controllers/teacher-profiles.controller';
import { TeacherProfilesService } from './services/teacher-profiles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserCredential,
      UserConsent,
      TeacherProfile,
    ]),
  ],
  controllers: [
    UsersController,
    // UsersAdminController,
    TeacherProfilesController,
  ],
  providers: [
    UsersService,
    //UserRepository,
    //TeacherProfileRepository,
    UsersAdminController,
    TeacherProfilesService,
  ],
  exports: [UsersService, TypeOrmModule, TeacherProfilesService],
})
export class UsersModule {}
