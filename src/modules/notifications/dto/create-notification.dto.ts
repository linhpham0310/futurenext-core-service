import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export enum NotificationChannelType {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

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

  @IsEnum(NotificationChannelType)
  @IsOptional()
  type?: NotificationChannelType;
}
