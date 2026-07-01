import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CertificateService } from '../certificate/certificate.service';

@Controller('admin/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get()
  async getAll() {
    return this.certificateService.getAllCertificates();
  }

  @Patch(':id/revoke')
  async revoke(@Param('id') id: string) {
    return this.certificateService.revokeCertificate(id);
  }
}
