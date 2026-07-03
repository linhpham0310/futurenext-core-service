// src/modules/certificate/certificate.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';
import { SupabaseStorageModule } from '../storage/supabase-storage.module';
import { StorageService } from '../storage/storage.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    PrismaModule,
    SupabaseStorageModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [CertificateController],
  providers: [
    CertificateService,
    {
      provide: StorageService,
      useClass: SupabaseStorageService,
    },
  ],
})
export class CertificateModule {}
