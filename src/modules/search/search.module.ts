import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SearchService } from './search.service';
import { TeacherSearchController } from './teacher-search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherSearchController],
  providers: [SearchService],
})
export class SearchModule {}
