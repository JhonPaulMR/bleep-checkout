import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SaleStatus } from '../../../../generated/prisma/enums.js';

export class ListSalesQueryDto {
  @ApiPropertyOptional({
    enum: SaleStatus,
    description: 'Filtra vendas pelo status informado',
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;
}
