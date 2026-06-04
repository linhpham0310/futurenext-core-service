import { IsArray, IsString, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SectionOrderDto {
  @IsString()
  id: string;

  @IsInt()
  orderIndex: number;
}

export class ReorderSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderDto)
  orders: SectionOrderDto[];
}
