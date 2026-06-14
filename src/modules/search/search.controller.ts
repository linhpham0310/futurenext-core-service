import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SearchService } from './search.service';
import { PaginatedSearchDto, SearchDto } from './dto/search.dto';

// ==================== PUBLIC SEARCH CONTROLLER ====================
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('courses')
  async searchCourses(@Query() query: PaginatedSearchDto) {
    return this.searchService.searchCourses(query.q, query.page, query.limit);
  }
}

// ==================== TEACHER SEARCH CONTROLLER ====================
@Controller('teacher/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherSearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Request() req, @Query() dto: SearchDto) {
    return this.searchService.searchForTeacher(req.user.sub, dto.q);
  }
}
