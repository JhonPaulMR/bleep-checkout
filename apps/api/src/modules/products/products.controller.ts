import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // TODO #4: expandir listagem mínima de produtos ativos no caixa com busca e código de barras
  @Get()
  @Roles(Role.OPERATOR)
  @ApiOperation({
    summary: 'Lista os produtos ativos disponíveis para venda no caixa',
  })
  @ApiResponse({ status: 200, description: 'Lista de produtos ativos' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para operadores de caixa',
  })
  listActive() {
    return this.products.findActive();
  }
}
