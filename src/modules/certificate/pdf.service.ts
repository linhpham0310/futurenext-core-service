import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PdfService {
  constructor(private configService: ConfigService) {}

  async generateCertificate(
    studentName: string,
    courseTitle: string,
    issuedDate: Date,
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
        .text(`Ngày cấp: ${issuedDate.toLocaleDateString('vi-VN')}`, 0, 300, {
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

  async uploadCertificateToStorage(
    certificateBuffer: Buffer,
    filename: string,
  ): Promise<string> {
    // Upload lên S3/Supabase
    // Giả định trả về URL
    const url = `https://storage.example.com/certificates/${filename}`;
    return url;
  }
}
