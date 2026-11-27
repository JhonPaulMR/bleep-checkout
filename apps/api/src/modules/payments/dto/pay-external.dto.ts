import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn } from 'class-validator';
import { PaymentMethod } from '../../../../generated/prisma/enums.js';

const EXTERNAL_PAYMENT_METHODS = [
  PaymentMethod.EXTERNAL_CREDIT,
  PaymentMethod.EXTERNAL_DEBIT,
] as const;

export type ExternalPaymentMethod = (typeof EXTERNAL_PAYMENT_METHODS)[number];

export class PayExternalDto {
  @ApiProperty({ enum: EXTERNAL_PAYMENT_METHODS })
  @IsIn(EXTERNAL_PAYMENT_METHODS)
  method!: ExternalPaymentMethod;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  approved!: boolean;
}
