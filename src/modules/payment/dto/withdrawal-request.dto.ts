export class WithdrawalRequestDto {
  id: string;
  teacherId: string;
  teacherName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  requestedAt: Date;
  courseCount: number;
  studentCount: number;
}
