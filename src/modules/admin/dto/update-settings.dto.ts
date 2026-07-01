// update-settings.dto.ts
import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  general?: Record<string, any>;

  @IsOptional()
  @IsObject()
  payment?: Record<string, any>;

  @IsOptional()
  @IsObject()
  email?: Record<string, any>;

  @IsOptional()
  @IsObject()
  ai?: Record<string, any>;
}
