import {
  IsArray,
  IsString,
  ArrayMinSize,
  ArrayNotEmpty,
} from 'class-validator';
export class UpdateOutcomesDto {
  // TASK S4-CM-01: Validate mảng các kết quả đầu ra
  @IsArray({ message: 'Outcomes phải là một mảng' })
  @ArrayNotEmpty({ message: 'Danh sách kết quả không được để trống' })
  @ArrayMinSize(1, { message: 'Phải có ít nhất một kết quả đầu ra' })
  @IsString({ each: true, message: 'Mỗi kết quả phải là một chuỗi văn bản' })
  outcomes: string[];
}
