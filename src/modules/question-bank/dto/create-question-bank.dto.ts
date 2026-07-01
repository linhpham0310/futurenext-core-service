import { PartialType } from '@nestjs/swagger/dist/type-helpers';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';

export class CreateQuestionBankDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateQuestionBankDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export enum QuestionType {
  MCQ = 'MCQ',
  ESSAY = 'ESSAY',
  CODING = 'CODING',
}

export class CreateQuestionItemDto {
  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsOptional()
  options?: string[]; // chỉ dùng cho MCQ

  @IsOptional()
  correctAnswer?: string;

  @IsOptional()
  explanation?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateQuestionItemDto extends PartialType(CreateQuestionItemDto) {}
