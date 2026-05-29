// --- FILE TẠO MỚI ---
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@/modules/users/entities/user.entity';

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'Vai trò (Role) không được để trống.' })
  @IsEnum(UserRole, {
    message: 'Vai trò không hợp lệ. Chỉ chấp nhận ADMIN, TEACHER hoặc STUDENT.',
  })
  role: UserRole;
}
