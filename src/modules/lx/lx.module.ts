// lx.module.ts
import { Module } from '@nestjs/common';
import { LxService } from './lx.service';
import { LxController } from './lx.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LxController],
  providers: [LxService],
  exports: [LxService],
})
export class LxModule {}
