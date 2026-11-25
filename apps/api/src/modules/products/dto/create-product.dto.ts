import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Café Expresso 250g' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '7891000100103', pattern: '^\\d{13}$' })
  @IsString()
  @Matches(/^\d{13}$/, {
    message: 'Código de barras deve conter exatamente 13 dígitos numéricos.',
  })
  barcode!: string;

  @ApiProperty({ example: 1490, minimum: 1 })
  @IsInt()
  @Min(1)
  priceCents!: number;
}
