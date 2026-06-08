import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { QuestionDto } from './question.dto';

export enum ExamType {
  MCQ = 'MCQ',
  ESSAY = 'ESSAY',
  MIXED = 'MIXED',
}

export enum QuestionType {
  MCQ = 'MCQ',
  ESSAY = 'ESSAY',
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

  @IsNumber()
  @Min(1)
  duration: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}

export class PublishExamDto {
  @IsUUID()
  courseId: string;
}
