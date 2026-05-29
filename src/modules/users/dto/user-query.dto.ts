import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity'; // [KẾ THỪA S1]

export class UserQueryDto {
  @IsOptional()
  @Type(() => Number) // Ép kiểu từ string (URL) sang Number
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // Khống chế tối đa 100 bản ghi/trang để tránh treo DB
  limit: number = 10;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  q?: string; // Tham số tìm kiếm mờ
}
