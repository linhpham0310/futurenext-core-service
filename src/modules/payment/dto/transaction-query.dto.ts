export class TransactionQueryDto {
  page?: number;
  limit?: number;
  q?: string;
  status?: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';
}
