import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExamType {
  MCQ = 'MCQ',
  ESSAY = 'ESSAY',
  MIXED = 'MIXED',
}

export class QuestionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(['MCQ', 'ESSAY'])
  type: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  options?: string[];

  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  points?: number;
}

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsEnum(ExamType)
  type: ExamType;

  @IsInt()
  @Min(1)
  duration: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
