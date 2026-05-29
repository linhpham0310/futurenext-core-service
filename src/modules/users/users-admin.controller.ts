import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserQueryDto } from './dto/user-query.dto';
import { UserRole } from './entities/user.entity';
import { Roles } from '@/shared/decorators/roles.decorator';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { UsersService } from './services/users.service';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // [BẢO MẬT] Chỉ Admin mới có quyền gọi API này
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }
}
