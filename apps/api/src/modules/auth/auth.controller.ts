import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@Req() request: { user: JwtPayload }) {
    return this.auth.me(request.user.sub);
  }
}
