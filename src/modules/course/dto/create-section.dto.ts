import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class CreateSectionDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề chương mục không được để trống' })
  @MaxLength(255)
  title: string;
}
