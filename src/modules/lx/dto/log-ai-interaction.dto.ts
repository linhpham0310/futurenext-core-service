import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';

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
