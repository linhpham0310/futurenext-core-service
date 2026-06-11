import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SearchService } from './search.service';
import { TeacherSearchController } from './teacher-search.controller';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController, TeacherSearchController],
  providers: [SearchService],
})
export class SearchModule {}
