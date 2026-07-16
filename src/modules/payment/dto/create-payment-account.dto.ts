import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreatePaymentAccountDto {
  @IsString()
  @IsIn(['BANK', 'MOMO', 'ZALOPAY', 'VNPAY'])
  type: 'BANK' | 'MOMO' | 'ZALOPAY' | 'VNPAY';

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountHolder: string;
}
