import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { QuestionType } from './create-exam.dto';

export class QuestionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}
