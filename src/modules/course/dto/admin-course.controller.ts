import {
  Controller,
  Get,
  Param,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CourseService } from '../course.service';
import { ProcessReviewDto } from '../dto/process-review.dto';
import { UserRole } from '@/modules/users/entities/user.entity';

@Controller('admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  async getAllCourses(@Query() query: any) {
    return this.courseService.findAllForAdmin(query);
  }

  @Get(':id')
  async getCourseDetail(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
  }

  @Patch(':id/approve')
  async approveCourse(@Param('id') id: string, @Request() req) {
    return this.courseService.processReview(id, req.user.sub, {
      action: 'PUBLISHED',
    });
  }

  @Patch(':id/reject')
  async rejectCourse(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @Request() req,
  ) {
    return this.courseService.processReview(id, req.user.sub, {
      action: 'REJECTED',
      reason: dto.reason,
    });
  }

  @Put(':id')
  async updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courseService.updateCourse(id, dto);
  }

  @Delete(':id')
  async deleteCourse(@Param('id') id: string) {
    return this.courseService.deleteCourse(id);
  }
}
