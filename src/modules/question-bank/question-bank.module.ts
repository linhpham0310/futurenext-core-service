import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuestionBankController],
  providers: [QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
