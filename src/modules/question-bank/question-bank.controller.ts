import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { QuestionBankService } from './question-bank.service';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  CreateQuestionItemDto,
  UpdateQuestionItemDto,
} from './dto/create-question-bank.dto';

@Controller('teacher/question-banks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  // ===== BANK CRUD =====
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBank(@Request() req, @Body() dto: CreateQuestionBankDto) {
    return this.questionBankService.createBank(req.user.sub, dto);
  }

  @Get()
  async getBanks(@Request() req) {
    return this.questionBankService.getBanks(req.user.sub);
  }

  @Get(':id')
  async getBank(@Param('id') id: string, @Request() req) {
    return this.questionBankService.getBank(id, req.user.sub);
  }

  @Put(':id')
  async updateBank(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateQuestionBankDto,
  ) {
    return this.questionBankService.updateBank(id, req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBank(@Param('id') id: string, @Request() req) {
    await this.questionBankService.deleteBank(id, req.user.sub);
  }

  // ===== QUESTION ITEMS CRUD =====
  @Post(':bankId/items')
  @HttpCode(HttpStatus.CREATED)
  async addQuestion(
    @Param('bankId') bankId: string,
    @Request() req,
    @Body() dto: CreateQuestionItemDto,
  ) {
    return this.questionBankService.addQuestion(bankId, req.user.sub, dto);
  }

  @Get(':bankId/items')
  async getQuestions(@Param('bankId') bankId: string, @Request() req) {
    return this.questionBankService.getQuestions(bankId, req.user.sub);
  }

  @Put(':bankId/items/:itemId')
  async updateQuestion(
    @Param('bankId') bankId: string,
    @Param('itemId') itemId: string,
    @Request() req,
    @Body() dto: UpdateQuestionItemDto,
  ) {
    return this.questionBankService.updateQuestion(
      bankId,
      itemId,
      req.user.sub,
      dto,
    );
  }

  @Delete(':bankId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(
    @Param('bankId') bankId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    await this.questionBankService.deleteQuestion(bankId, itemId, req.user.sub);
  }
}
