import { Module } from '@nestjs/common';
import { CertificateController } from './certificate.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CertificateController],
})
export class CertificateModule {}
