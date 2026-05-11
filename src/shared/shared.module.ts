import { Global, Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HashingService } from './providers/hashing/hashing.service';
import { AuditService } from './providers/audit/audit.service';
import { SecurityAuditLog } from './providers/audit/audit.entity';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SecurityAuditLog])],
  providers: [HashingService, AuditService, Logger],
  exports: [HashingService, AuditService, Logger],
})
export class SharedModule {}
