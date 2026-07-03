// src/modules/certificate/certificate.service.ts
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from 'prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import PDFDocument from 'pdfkit';

@Injectable()
export class CertificateService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getAllCertificates() {
    const certificates = await this.prisma.certificate.findMany({
      include: {
        course: { select: { title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    const userIds = [...new Set(certificates.map((c) => c.userId))];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return certificates.map((cert) => {
      const user = userMap.get(cert.userId);
      return {
        ...cert,
        user: user ? { fullName: user.fullName, email: user.email } : null,
      };
    });
  }

  async revokeCertificate(id: string) {
    await this.prisma.certificate.delete({ where: { id } });
    return { success: true };
  }

  async getCertificatesByTeacher(teacherId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { course: { instructorId: teacherId } },
      include: {
        course: { select: { title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    const userIds = [...new Set(certificates.map((c) => c.userId))];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return certificates.map((cert) => {
      const user = userMap.get(cert.userId);
      return {
        id: cert.id,
        studentName: user?.fullName ?? cert.studentName,
        courseTitle: cert.course.title,
        issuedAt: cert.issuedAt,
        certificateUrl: cert.certificateUrl,
      };
    });
  }

  async issueCertificate(
    courseId: string,
    studentId: string,
    teacherId: string,
  ) {
    // ... kiểm tra quyền và hoàn thành khóa học ...

    const student = await this.userRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Tạo PDF
    const pdfBuffer = await this.generateCertificatePDF(
      student.fullName,
      course.title,
      new Date(),
    );

    // Upload lên storage
    const fileName = `certificates/${courseId}-${studentId}-${Date.now()}.pdf`;
    const certificateUrl = await this.storage.uploadFile(
      pdfBuffer,
      fileName,
      'application/pdf',
    );

    return this.prisma.certificate.create({
      data: {
        userId: studentId,
        courseId,
        studentName: student.fullName,
        studentEmail: student.email,
        courseTitle: course.title,
        certificateUrl,
        issuedAt: new Date(),
      },
    });
  }

  private async generateCertificatePDF(
    studentName: string,
    courseTitle: string,
    issuedAt: Date,
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f0f4ff');
      doc
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke('#2563eb');

      doc
        .fontSize(36)
        .fillColor('#1e293b')
        .text('CHỨNG CHỈ HOÀN THÀNH', 0, 50, { align: 'center' });
      doc
        .fontSize(18)
        .fillColor('#475569')
        .text('Chứng nhận rằng', 0, 100, { align: 'center' });
      doc
        .fontSize(28)
        .fillColor('#0f172a')
        .text(studentName, 0, 140, { align: 'center' });
      doc
        .fontSize(18)
        .fillColor('#475569')
        .text(`đã hoàn thành khóa học`, 0, 190, { align: 'center' });
      doc
        .fontSize(24)
        .fillColor('#2563eb')
        .text(courseTitle, 0, 230, { align: 'center' });
      doc
        .fontSize(14)
        .fillColor('#64748b')
        .text(`Ngày cấp: ${issuedAt.toLocaleDateString('vi-VN')}`, 0, 300, {
          align: 'center',
        });

      doc
        .fontSize(10)
        .fillColor('#94a3b8')
        .text(
          'Chứng chỉ này được cấp bởi FutureNext.ai',
          0,
          doc.page.height - 50,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
