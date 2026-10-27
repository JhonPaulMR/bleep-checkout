import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash('senha-descartavel');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    // Com e-mail inexistente, verifica contra um hash descartável para que
    // o tempo de resposta não revele se o e-mail existe.
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const senhaConfere = await argon2.verify(hash, password);
    if (!user || !senhaConfere) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });

    return { accessToken, user: { name: user.name, role: user.role } };
  }
}
