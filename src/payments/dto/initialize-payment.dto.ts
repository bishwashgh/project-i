import { IsEnum, IsInt, Min } from 'class-validator';
import { PaymentProvider } from '../entities/payment.entity';

export class InitializePaymentDto {
  @IsInt()
  @Min(1)
  bookingId!: number;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}