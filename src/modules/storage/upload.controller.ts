import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';
import { CourseOwnershipGuard } from '../course/guards/course-ownership.guard';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Controller('courses')
export class UploadController {
  constructor(private readonly storage: SupabaseStorageService) {}

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/upload-url')
  async getUploadUrl(
    @Param('id') courseId: string,
    @Query('fileName') fileName: string,
  ) {
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `courses/${courseId}/${Date.now()}-${sanitized}`;
    const { uploadUrl, fileKey: returnedKey } =
      await this.storage.createSignedUploadUrl(fileKey);
    return { uploadUrl, fileKey: returnedKey };
  }
}
