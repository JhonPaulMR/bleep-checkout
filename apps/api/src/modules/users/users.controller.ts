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
import { CreateOperatorDto } from './dto/create-operator.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Cadastra um operador de caixa' })
  @ApiResponse({ status: 201, description: 'Operador cadastrado com sucesso' })
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
    description: 'Já existe um usuário com este e-mail.',
  })
  create(
    @Body() body: CreateOperatorDto,
    @Req() request: { user: JwtPayload },
  ) {
    return this.users.createOperator(body, request.user.sub);
  }

  @Get()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Lista os operadores de caixa cadastrados' })
  @ApiResponse({ status: 200, description: 'Lista de operadores cadastrados' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso permitido apenas para gerentes',
  })
  listOperators() {
    return this.users.listOperators();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um usuário por id' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  @ApiResponse({
    status: 403,
    description: 'Você não tem permissão para consultar este usuário.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
  })
  findOne(
    @Param('id') id: string,
    @Req() request: { user: JwtPayload },
  ) {
    return this.users.findByIdForRequester(id, request.user.sub);
  }
}
