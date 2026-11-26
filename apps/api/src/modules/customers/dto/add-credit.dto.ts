import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddCreditDto {
  @ApiProperty({
    example: 5000,
    description:
      'Valor em centavos a adicionar ao crédito do cliente (inteiro positivo)',
  })
  @IsInt()
  @Min(1)
  amountCents!: number;
}
