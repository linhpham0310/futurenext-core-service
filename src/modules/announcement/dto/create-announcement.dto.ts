// src/modules/announcement/dto/create-announcement.dto.ts
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAnnouncementDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
