import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HashingService } from './providers/hashing.service';
import { AuditService } from './providers/audit.service';
// Guards thường không cần import/export ở đây nếu dùng @UseGuards hoặc global
// import { JwtAuthGuard } from './guards/jwt-auth.guard';
// import { RolesGuard } from './guards/roles.guard';
import { SecurityAuditLog } from './entities/security-audit-log.entity';

@Global() //  Quan trọng: Giúp các providers (HashingService, AuditService) có thể inject bất cứ đâu.
@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityAuditLog]), //  Đăng ký entity cho AuditService sử dụng
  ],
  providers: [
    HashingService,
    AuditService,
    // Guards không cần khai báo ở providers nếu không inject vào đâu khác
  ],
  //  Xuất các providers để đảm bảo tính tường minh (dù đã có @Global)
  exports: [HashingService, AuditService],

})
export class SharedModule {}
