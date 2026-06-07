import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';
import { CourseOwnershipGuard } from '../course/guards/course-ownership.guard';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

@Controller('courses')
export class UploadController {
  constructor(private readonly storage: SupabaseStorageService) {}

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/upload-url')
  async getUploadUrl(
    @Param('id') courseId: string,
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
  ) {
    const { uploadUrl, fileKey } = await this.storage.createSignedUploadUrl(
      courseId,
      fileName,
    );

    return { uploadUrl, fileKey };
  }
}
