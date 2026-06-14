import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import {
  StudentExamController,
  TeacherExamController,
} from './exam.controller';
import { ExamService } from './exam.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudentExamController, TeacherExamController],
  providers: [ExamService],
})
export class ExamModule {}
