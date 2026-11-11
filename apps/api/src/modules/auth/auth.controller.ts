import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Entra no sistema com e-mail e senha' })
  @ApiBody({
    type: LoginDto,
    examples: {
      gerente: {
        summary: 'Gerente do seed',
        value: { email: 'gerente@teste.local', password: 'Gerente@123' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Token de acesso e papel do usuário' })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({ status: 401, description: 'E-mail ou senha incorretos' })
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Devolve o usuário da sessão atual' })
  @ApiResponse({ status: 200, description: 'Nome e papel do usuário' })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida ou expirada',
  })
  me(@Req() request: { user: JwtPayload }) {
    return this.auth.me(request.user.sub);
  }
}
