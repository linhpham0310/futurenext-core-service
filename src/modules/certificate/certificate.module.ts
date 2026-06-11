import { Module } from '@nestjs/common';
import { CertificateController } from './certificate.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TeacherCertificateController } from './teacher-certificate.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CertificateController, TeacherCertificateController],
})
export class CertificateModule {}
