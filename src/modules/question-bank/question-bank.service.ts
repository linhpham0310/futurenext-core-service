import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  CreateQuestionItemDto,
  UpdateQuestionItemDto,
} from './dto/create-question-bank.dto';

@Injectable()
export class QuestionBankService {
  constructor(private prisma: PrismaService) {}

  private async ensureOwnership(bankId: string, teacherId: string) {
    const bank = await this.prisma.questionBank.findUnique({
      where: { id: bankId },
      select: { teacherId: true },
    });
    if (!bank) throw new NotFoundException('Ngân hàng không tồn tại');
    if (bank.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền truy cập ngân hàng này');
    }
    return bank;
  }

  // ===== BANK =====
  async createBank(teacherId: string, dto: CreateQuestionBankDto) {
    return this.prisma.questionBank.create({
      data: { ...dto, teacherId },
    });
  }

  async getBanks(teacherId: string) {
    // Lấy cả bank của teacher và bank public
    return this.prisma.questionBank.findMany({
      where: {
        OR: [{ teacherId }, { isPublic: true }],
      },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBank(bankId: string, teacherId: string) {
    await this.ensureOwnership(bankId, teacherId);
    return this.prisma.questionBank.findUnique({
      where: { id: bankId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async updateBank(
    bankId: string,
    teacherId: string,
    dto: UpdateQuestionBankDto,
  ) {
    await this.ensureOwnership(bankId, teacherId);
    return this.prisma.questionBank.update({
      where: { id: bankId },
      data: dto,
    });
  }

  async deleteBank(bankId: string, teacherId: string) {
    await this.ensureOwnership(bankId, teacherId);
    await this.prisma.questionBank.delete({ where: { id: bankId } });
  }

  // ===== ITEMS =====
  async addQuestion(
    bankId: string,
    teacherId: string,
    dto: CreateQuestionItemDto,
  ) {
    await this.ensureOwnership(bankId, teacherId);
    return this.prisma.questionBankItem.create({
      data: { ...dto, bankId },
    });
  }

  async getQuestions(bankId: string, teacherId: string) {
    await this.ensureOwnership(bankId, teacherId);
    return this.prisma.questionBankItem.findMany({
      where: { bankId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateQuestion(
    bankId: string,
    itemId: string,
    teacherId: string,
    dto: UpdateQuestionItemDto,
  ) {
    await this.ensureOwnership(bankId, teacherId);
    return this.prisma.questionBankItem.update({
      where: { id: itemId, bankId },
      data: dto,
    });
  }

  async deleteQuestion(bankId: string, itemId: string, teacherId: string) {
    await this.ensureOwnership(bankId, teacherId);
    await this.prisma.questionBankItem.delete({
      where: { id: itemId, bankId },
    });
  }
}
