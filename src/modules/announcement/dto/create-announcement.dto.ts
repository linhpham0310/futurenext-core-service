// src/modules/announcement/dto/create-announcement.dto.ts
import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // nếu dùng Swagger

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ example: 'Thông báo quan trọng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Nội dung chi tiết...' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
