import { IsString, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';
import { ExamType } from './create-exam.dto';

export class GenerateQuizDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsEnum(ExamType)
  type: ExamType;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsNumber()
  @Min(1)
  numQuestions: number;
}
