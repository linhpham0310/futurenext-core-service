// src/modules/certificate/certificate.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  async getCertificatesByTeacher(teacherId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { course: { instructorId: teacherId } },
      include: {
        course: { select: { title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return certificates.map((cert) => ({
      id: cert.id,
      studentName: cert.user.fullName,
      courseTitle: cert.course.title,
      issuedAt: cert.issuedAt,
      certificateUrl: cert.certificateUrl,
    }));
  }
}
