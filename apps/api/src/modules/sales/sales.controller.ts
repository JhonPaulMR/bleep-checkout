import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { SalesService } from './sales.service.js';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary: 'Cria uma venda com total calculado no servidor a partir do banco',
  })
  @ApiResponse({ status: 201, description: 'Venda criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para operadores de caixa',
  })
  @ApiResponse({
    status: 422,
    description: 'Produto inexistente ou inativo',
  })
  create(
    @Body() body: CreateSaleDto,
    @Req() request: { user: JwtPayload },
  ) {
    return this.sales.create(body, request.user.sub);
  }

  @Get(':id')
  @Roles(Role.OPERATOR)
  @ApiOperation({ summary: 'Consulta uma venda do operador autenticado' })
  @ApiResponse({ status: 200, description: 'Venda encontrada' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado para outro operador ou gerente',
  })
  @ApiResponse({ status: 404, description: 'Venda não encontrada.' })
  findOne(
    @Param('id') id: string,
    @Req() request: { user: JwtPayload },
  ) {
    return this.sales.findByIdForOperator(id, request.user.sub);
  }
}
