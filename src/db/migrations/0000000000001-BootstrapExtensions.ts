// migrations/0000000000001-BootstrapExtensions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BootstrapExtensions0000000000001 implements MigrationInterface {
  name = 'BootstrapExtensions0000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Một nơi DUY NHẤT quản lý tất cả extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không drop extensions vì có thể ảnh hưởng các schema khác
    // Extensions chỉ drop thủ công khi teardown toàn bộ DB
  }
}
