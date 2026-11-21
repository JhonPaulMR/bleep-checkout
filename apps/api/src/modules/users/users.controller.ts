import { Body, Controller, Post, Req } from '@nestjs/common';
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
}
