import { Module, Global, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { HashingService } from './providers/hashing/hashing.service';
import { AuditService } from './providers/audit/audit.service';
import { SecurityAuditLog } from './providers/audit/audit.entity';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoginAttemptService } from './providers/rate-limit/login-attempt.service';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SecurityAuditLog])],
  providers: [
    HashingService,
    AuditService,
    LoginAttemptService,
    JwtAuthGuard,
    RolesGuard,
    Logger,
    HttpExceptionFilter,
  ],
  exports: [
    HashingService,
    AuditService,
    LoginAttemptService,
    JwtAuthGuard,
    RolesGuard,
    Logger,
  ],
})
export class SharedModule {}
