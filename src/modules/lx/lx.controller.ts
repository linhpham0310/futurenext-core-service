import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourseEntitlementGuard } from './guards/course-entitlement.guard';
import { LxService } from './lx.service';
@Controller('lx')
export class LxController {
  constructor(private readonly lxService: LxService) {}
  // ---------------------------------------------------------
  // TASK: LX-BE-1.2: Áp dụng Guard bảo vệ nội dung bài học
  // ---------------------------------------------------------
  @UseGuards(JwtAuthGuard, CourseEntitlementGuard)
  @Get('lesson/:id')
  async getLessonContent(@Param('id') id: string, @Request() req) {
    return this.lxService.getLessonContent(id, req.user.id);
  }
}
