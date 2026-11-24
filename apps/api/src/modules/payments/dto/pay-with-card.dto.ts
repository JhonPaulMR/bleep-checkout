import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PayerIdentificationDto {
  @ApiProperty({ example: 'CPF' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: '19119119100' })
  @IsString()
  @IsNotEmpty()
  number!: string;
}

export class PayWithCardDto {
  @ApiProperty({ example: 'ff8080814c11e237014c1ff593b57b4d' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'master' })
  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  installments!: number;

  @ApiProperty({ type: PayerIdentificationDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PayerIdentificationDto)
  identification!: PayerIdentificationDto;

  @ApiPropertyOptional({ example: 'comprador@sandbox.test' })
  @IsOptional()
  @IsEmail()
  payerEmail?: string;
}
