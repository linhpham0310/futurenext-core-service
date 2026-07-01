import { Module } from '@nestjs/common';
import { LabService } from './lab.service';

@Module({
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
