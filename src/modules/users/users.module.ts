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

@Module({
  imports: [
    // Đăng ký các entity thuộc Users module với TypeORM
    TypeOrmModule.forFeature([
      User,
      UserCredential, // Mặc dù không trực tiếp dùng, nhưng là relation của User
      UserConsent,
      TeacherProfile,
    ]),
  ],
  controllers: [
    UsersController, // Controller cho người dùng tự quản lý
    // UsersAdminController, // Controller cho Admin (sẽ tạo sau)
  ],
  providers: [
    UsersService, // Service chứa logic nghiệp vụ
    // Thêm các Repository nếu bạn dùng Repository Pattern tường minh
    //UserRepository,
    //TeacherProfileRepository,
    UsersAdminController, // [Task: S2-BE-06] Đăng ký Admin Controller vào Module
  ],
  // Export UsersService nếu module khác cần inject (ví dụ: TeacherProfileService cần cập nhật role)
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
