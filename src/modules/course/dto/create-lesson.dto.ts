import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export enum LessonType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  QUIZ = 'QUIZ',
}

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề bài học không được để trống' })
  title: string;

  @IsEnum(LessonType, { message: 'Loại bài học không hợp lệ' })
  type: LessonType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  isFreePreview?: boolean;
}
