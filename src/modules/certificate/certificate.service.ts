// src/modules/certificate/certificate.service.ts
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from 'prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class CertificateService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async getAllCertificates() {
    return this.prisma.certificate.findMany({
      include: {
        course: { select: { title: true } },
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { issuedAt: 'desc' },
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
        user: { select: { fullName: true, email: true } },
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

  async issueCertificate(
    courseId: string,
    studentId: string,
    teacherId: string,
  ) {
    // ... kiểm tra quyền và hoàn thành khóa học ...

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

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

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f0f4ff');
      // Border
      doc
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke('#2563eb');

      // Title
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

      // Footer
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
