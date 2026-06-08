import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AiAskDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsString()
  question: string;
}
