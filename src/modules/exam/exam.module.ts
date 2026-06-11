import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TeacherExamController } from './teacher-exam.controller';
import { StudentExamController } from './student-exam.controller';
import { ExamService } from './exam.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherExamController, StudentExamController],
  providers: [ExamService],
})
export class ExamModule {}
