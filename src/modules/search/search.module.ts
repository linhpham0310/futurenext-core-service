import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SearchService } from './search.service';
import { SearchController, TeacherSearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController, TeacherSearchController],
  providers: [SearchService],
})
export class SearchModule {}
