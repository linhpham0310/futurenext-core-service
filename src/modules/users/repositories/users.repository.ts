import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
// Import các entities khác nếu cần truy vấn phức tạp

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  // --- Các hàm truy vấn tùy chỉnh sẽ thêm sau ---
  // Ví dụ:
  // async findByEmail(email: string): Promise<User | null> {
  //   return this.findOne({ where: { email } });
  // }

  // async findUserWithCredentials(email: string): Promise<User | null> {
  //   // Query builder để join với user_credentials
  // }

  // async createUserTransaction( /* ... */ ): Promise<{ newUser: User, otp: string }> {
  //   // Sử dụng queryRunner để chạy transaction
  // }

  // async updateProfileWithOptimisticLock( /* ... */ ): Promise<number> {
  //   // Dùng .update() với điều kiện where updatedAt
  // }

  // async countActiveAdminsExcluding(userIdToExclude: string): Promise<number> {
  //  // ...
  // }
}
