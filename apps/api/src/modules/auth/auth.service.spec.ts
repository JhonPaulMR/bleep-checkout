import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const secret = 'segredo-de-teste';
  let jwt: JwtService;
  let users: { findByEmail: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(async () => {
    jwt = new JwtService({ secret });
    users = { findByEmail: vi.fn() };
    service = new AuthService(users as unknown as UsersService, jwt);
    users.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Gerente',
      email: 'gerente@teste.com',
      passwordHash: await argon2.hash('senha-correta'),
      role: 'MANAGER',
      createdAt: new Date(),
    });
  });

  it('com a senha correta devolve token com sub e role, e o usuário sem hash', async () => {
    const result = await service.login('gerente@teste.com', 'senha-correta');

    const payload = await jwt.verifyAsync(result.accessToken);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('MANAGER');
    expect(result.user).toEqual({ name: 'Gerente', role: 'MANAGER' });
    expect(users.findByEmail).toHaveBeenCalledWith('gerente@teste.com');
  });

  it('com e-mail inexistente rejeita com UnauthorizedException', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.login('ninguem@teste.com', 'qualquer-senha'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('com senha errada rejeita com UnauthorizedException e não assina token', async () => {
    const signSpy = vi.spyOn(jwt, 'signAsync');

    await expect(
      service.login('gerente@teste.com', 'senha-errada'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signSpy).not.toHaveBeenCalled();
  });
});
