import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

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
}
