import { Module } from '@nestjs/common';
import { LxService } from './lx.service';
import { LxController } from './lx.controller';

@Module({
  providers: [LxService],
  controllers: [LxController],
})
export class LxModule {}
