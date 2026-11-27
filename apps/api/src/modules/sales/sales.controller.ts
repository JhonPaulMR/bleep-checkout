import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
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
import { ListSalesQueryDto } from './dto/list-sales-query.dto.js';
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

  @Get()
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary: 'Lista as vendas do operador autenticado (com filtro opcional por status)',
  })
  @ApiResponse({ status: 200, description: 'Vendas listadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para operadores de caixa',
  })
  findAll(
    @Query() query: ListSalesQueryDto,
    @Req() request: { user: JwtPayload },
  ) {
    return this.sales.findAllForOperator(request.user.sub, query.status);
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

  @Post(':id/cancel')
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary: 'Cancela uma venda em aberto ou pendente do operador autenticado',
  })
  @ApiResponse({ status: 201, description: 'Venda cancelada com sucesso' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado para outro operador ou gerente',
  })
  @ApiResponse({ status: 404, description: 'Venda não encontrada.' })
  @ApiResponse({
    status: 422,
    description: 'Venda já concluída ou já cancelada',
  })
  cancel(
    @Param('id') id: string,
    @Req() request: { user: JwtPayload },
  ) {
    return this.sales.cancel(id, request.user.sub);
  }

  @Post(':id/reopen')
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary:
      'Reabre uma venda pendente do operador autenticado para troca de forma de pagamento',
  })
  @ApiResponse({ status: 201, description: 'Venda reaberta com sucesso' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado para outro operador ou gerente',
  })
  @ApiResponse({ status: 404, description: 'Venda não encontrada.' })
  @ApiResponse({
    status: 422,
    description: 'A venda não está pendente para reabertura.',
  })
  reopen(
    @Param('id') id: string,
    @Req() request: { user: JwtPayload },
  ) {
    return this.sales.reopen(id, request.user.sub);
  }
}
