import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export class UpdatePaymentStatusDto {
  @IsUUID()
  paymentId: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
