import { IsEnum } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class UpdateStudentStatusDto {
  @IsEnum([UserStatus.ACTIVE, UserStatus.LOCKED], {
    message: 'Trạng thái phải là ACTIVE hoặc LOCKED',
  })
  status: UserStatus.ACTIVE | UserStatus.LOCKED;
