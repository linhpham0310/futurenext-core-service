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
  content: string; // Có thể là S3 Key hoặc chuỗi Markdown

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number; // Chỉ gửi kèm nếu bài học là VIDEO
}
