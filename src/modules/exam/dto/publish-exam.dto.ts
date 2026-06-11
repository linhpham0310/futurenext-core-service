// src/modules/exam/dto/publish-exam.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator';

export class PublishExamDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
