// src/modules/payment/dto/update-payment-setting.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdatePaymentSettingDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bankAccount: string;

  @IsString()
  @IsNotEmpty()
  accountHolder: string;
}
