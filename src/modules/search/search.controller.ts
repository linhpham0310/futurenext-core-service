import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('courses')
  async searchCourses(
    @Query('q') q = '',
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.searchService.searchCourses(q, +page, +limit);
  }
}
