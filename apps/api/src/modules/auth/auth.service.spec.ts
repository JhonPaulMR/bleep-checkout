import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const secret = 'segredo-de-teste';
  let jwt: JwtService;
  let users: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  beforeEach(async () => {
    jwt = new JwtService({ secret });
    users = { findByEmail: vi.fn(), findById: vi.fn() };
    service = new AuthService(users as unknown as UsersService, jwt);
    const gerente = {
      id: 'user-1',
      name: 'Gerente',
      email: 'gerente@teste.com',
      passwordHash: await argon2.hash('senha-correta'),
      role: 'MANAGER',
      createdAt: new Date(),
    };
    users.findByEmail.mockResolvedValue(gerente);
    users.findById.mockResolvedValue(gerente);
  });

  it('com a senha correta devolve token com sub e role, e o usuário sem hash', async () => {
    const result = await service.login('gerente@teste.com', 'senha-correta');

    const payload = await jwt.verifyAsync(result.accessToken);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('ADMIN');
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

  describe('me', () => {
    it('com usuário existente devolve nome e papel, sem passwordHash', async () => {
      const result = await service.me('user-1');

      expect(users.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ name: 'Gerente', role: 'MANAGER' });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('com usuário inexistente rejeita com UnauthorizedException e a mensagem de sessão inválida', async () => {
      users.findById.mockResolvedValue(null);

      const erro = await service.me('user-apagado').catch((e) => e);

      expect(erro).toBeInstanceOf(UnauthorizedException);
      expect(erro.message).toBe('Sessão inválida ou expirada.');
    });
  });
});
