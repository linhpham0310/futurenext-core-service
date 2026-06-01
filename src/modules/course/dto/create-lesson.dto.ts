import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  ValidateIf,
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
  // TASK S3-CM-01: Validation đa hình cho Video
  @ValidateIf((o) => o.type === LessonType.VIDEO)
  @IsNumber({}, { message: 'Video bài giảng cần có thời lượng (giây)' })
  @Min(1)
  duration?: number;
  // TASK S3-CM-01: Validation đa hình cho Article hoặc Video URL
  @IsString()
  @IsNotEmpty({ message: 'Nội dung hoặc URL không được để trống' })
  content: string;

  @IsOptional()
  isFreePreview?: boolean;
}
