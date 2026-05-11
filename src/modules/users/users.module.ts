import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
// Import tất cả Entities thuộc quản lý của module này
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';
import { UserConsent } from './entities/user-consent.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { SharedModule } from '@/shared/shared.module'; // Import nếu UsersService cần AuditService,...

@Module({
  imports: [
    //  Đăng ký tất cả entities mà module này chịu trách nhiệm chính
    TypeOrmModule.forFeature([
      User,
      UserCredential,
      UserConsent,
      TeacherProfile,
    ]),
    SharedModule, // Import để có thể inject AuditService,... vào UsersService
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository], //  Khai báo Service và Repository
  //  Xuất UsersService và UsersRepository để các module khác (vd: AuthModule) có thể inject
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
