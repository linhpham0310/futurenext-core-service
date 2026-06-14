import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
