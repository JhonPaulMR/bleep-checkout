import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Cadastra um novo produto no catálogo' })
  @ApiResponse({ status: 201, description: 'Produto cadastrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para gerentes',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe um produto com este código de barras.',
  })
  create(@Body() body: CreateProductDto) {
    return this.products.create(body);
  }

  @Get()
  @Roles(Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary:
      'Lista produtos do catálogo (gerente) ou ativos disponíveis para venda no caixa (operador)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filtro parcial por nome do produto (case-insensitive)',
  })
  @ApiResponse({ status: 200, description: 'Lista de produtos' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para gerentes ou operadores de caixa',
  })
  list(@Req() request: { user: JwtPayload }, @Query('search') search?: string) {
    return this.products.listForRole(request.user.role, search);
  }

  @Get('barcode/:barcode')
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary: 'Busca produto ativo pelo código de barras para inclusão no caixa',
  })
  @ApiParam({
    name: 'barcode',
    description: 'Código de barras do produto',
  })
  @ApiResponse({ status: 200, description: 'Produto ativo encontrado' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para operadores de caixa',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não localizado.',
  })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.products.findActiveByBarcode(barcode);
  }
}
