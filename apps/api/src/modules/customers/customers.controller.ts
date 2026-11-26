import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AddCreditDto } from './dto/add-credit.dto.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { CustomersService } from './customers.service.js';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Cadastra um novo cliente com saldo inicial de crédito' })
  @ApiResponse({ status: 201, description: 'Cliente cadastrado com sucesso' })
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
    description: 'Já existe um cliente com este CPF.',
  })
  create(@Body() body: CreateCustomerDto) {
    return this.customers.create(body);
  }

  @Get()
  @Roles(Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Lista os clientes cadastrados ordenados por nome' })
  @ApiResponse({ status: 200, description: 'Lista de clientes' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para gerentes ou operadores de caixa',
  })
  findAll() {
    return this.customers.findAll();
  }

  @Post(':id/credits')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Adiciona crédito à conta de um cliente cadastrado' })
  @ApiResponse({ status: 201, description: 'Crédito adicionado com sucesso' })
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
    status: 404,
    description: 'Cliente não encontrado.',
  })
  addCredit(@Param('id') id: string, @Body() dto: AddCreditDto) {
    return this.customers.addCredit(id, dto.amountCents);
  }
}
