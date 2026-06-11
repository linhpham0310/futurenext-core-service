import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SearchDto } from './dto/search.dto';
import { SearchService } from './search.service';

@Controller('teacher/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherSearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  async search(@Request() req, @Query() dto: SearchDto) {
    return this.searchService.searchForTeacher(req.user.sub, dto.q);
  }
}
