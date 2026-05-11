// src/db/seeds/seed.module.ts
import { Module, Logger } from '@nestjs/common'; // Import Logger
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
// Import cấu hình DataSource từ file dùng cho CLI để đảm bảo nhất quán
import { dataSourceOptions } from '@/config/data-source';
// Import SharedModule để có thể inject HashingService
import { SharedModule } from '@/shared/shared.module';
import { SeedService } from './seed.service';
// Import các Entities mà SeedService sẽ trực tiếp thao tác
import { User } from '@/modules/users/entities/user.entity';
import { UserCredential } from '@/modules/users/entities/user-credential.entity';
import { UserConsent } from '@/modules/users/entities/user-consent.entity';
// Import các entities khác nếu SeedService cần dùng (ví dụ: SecurityAuditLog nếu muốn log seeding)
// import { SecurityAuditLog } from '@/shared/providers/audit/audit.entity';

@Module({
  imports: [
    // Load ConfigModule để đọc biến môi trường (.env)
    ConfigModule.forRoot({
      isGlobal: true, // Không cần thiết ở đây nhưng để cho giống AppModule
      envFilePath: '.env',
    }),
    // Kết nối TypeORM sử dụng cấu hình giống hệt CLI
    // Điều này đảm bảo script seed kết nối đúng DB mục tiêu
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Sử dụng ConfigService để đọc DB URL nếu cần
      inject: [ConfigService],
      // Dùng lại factory hoặc trực tiếp dataSourceOptions nếu nó đã đọc .env
      useFactory: () => dataSourceOptions,
      // Quan trọng: Chỉ định DataSource riêng cho module này nếu cần cô lập
      // dataSourceFactory: async (options) => {
      //   const dataSource = await new DataSource(options).initialize();
      //   return dataSource;
      // },
    }),
    // Import các entities mà SeedService cần inject Repository hoặc dùng EntityManager
    TypeOrmModule.forFeature([
      User,
      UserCredential,
      UserConsent,
      // SecurityAuditLog, // Thêm nếu SeedService cần ghi log audit
    ]),
    SharedModule, // Cần SharedModule để cung cấp HashingService và AuditService (nếu dùng)
  ],
  // Cung cấp SeedService và Logger
  providers: [SeedService, Logger],
  // Export SeedService để script bên ngoài có thể lấy ra và sử dụng
  exports: [SeedService],
})
export class SeedModule {}
