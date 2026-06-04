import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';
// --- TASK: LX-AI-1.1 (SPRINT 1) ---
// Định nghĩa enum các loại hình tương tác theo tài liệu LLD trang 2
export enum EInteractionType {
  CHAT = 'CHAT',
  LAB_COACH = 'LAB_COACH',
}
export class LogAiInteractionDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsEnum(EInteractionType, {
    message: 'interactionType phải là CHAT hoặc LAB_COACH',
  })
  interactionType: EInteractionType;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsNotEmpty()
  response: string;

  @IsObject()
  @IsOptional()
  contextSnapshot?: Record<string, any>;
}
