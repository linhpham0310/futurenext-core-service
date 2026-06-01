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
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
