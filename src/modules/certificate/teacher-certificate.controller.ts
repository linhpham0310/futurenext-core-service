import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('teacher/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherCertificateController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getCertificates(@Request() req) {
    const certificates = await this.prisma.certificate.findMany({
      where: { course: { instructorId: req.user.sub } },
      include: {
        course: { select: { title: true } },
        user: { select: { fullName: true } },
      },
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
