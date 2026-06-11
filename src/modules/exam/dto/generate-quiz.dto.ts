// src/modules/exam/dto/generate-quiz.dto.ts
import { IsString, IsNotEmpty, IsInt, Min, Max, IsEnum } from 'class-validator';

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class GenerateQuizDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  @Min(1)
  @Max(50)
  numQuestions: number;

  @IsEnum(Difficulty)
  difficulty: Difficulty;
}
