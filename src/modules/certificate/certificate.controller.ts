import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '../users/entities/user.entity';

@Controller('certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class CertificateController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getCertificates(@Request() req) {
    const certificates = await this.prisma.certificate.findMany({
      where: { course: { instructorId: req.user.sub } },
      include: { course: true },
      orderBy: { issuedAt: 'desc' },
    });
    return certificates.map((c) => ({
      id: c.id,
      studentName: c.user.fullName,
      courseTitle: c.course.title,
      issuedAt: c.issuedAt,
      certificateUrl: c.certificateUrl,
    }));
  }
}
