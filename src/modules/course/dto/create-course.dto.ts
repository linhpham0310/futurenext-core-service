import { SanitizeHtml } from '@/modules/common/decorators/sanitize-html.decorator';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề khóa học không được để trống' })
  @SanitizeHtml()
  title: string;

  @IsString()
  @IsOptional()
  @SanitizeHtml()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
