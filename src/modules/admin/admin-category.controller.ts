import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateCategoryDto } from './dto/category.dto';
import { AdminCategoryService } from './admin-category.service';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCategoryController {
  constructor(private readonly categoryService: AdminCategoryService) {}

  @Get()
  async getCategories() {
    return this.categoryService.getCategories();
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryService: AdminCategoryService) {}

  @Get()
  async getCategories() {
    return this.categoryService.getCategories();
  }
}
