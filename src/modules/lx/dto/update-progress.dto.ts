import {
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProgressMetadata } from '../types/lx.type';

export enum LessonProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class UpdateProgressDto {
  @IsEnum(LessonProgressStatus)
  status: LessonProgressStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentComplete?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lastPosition?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  metadata?: ProgressMetadata;
}
