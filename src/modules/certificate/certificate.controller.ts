// src/modules/certificate/certificate.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CertificateService } from './certificate.service';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

@Controller('teacher/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get()
  async getCertificates(@Request() req) {
    const teacherId = req.user.sub;
    return this.certificateService.getCertificatesByTeacher(teacherId);
  }
}
