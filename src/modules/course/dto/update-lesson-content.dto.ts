import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateLessonContentDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bài học không được để trống' })
  content: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;
}
