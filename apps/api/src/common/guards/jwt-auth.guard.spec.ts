import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const secret = 'segredo-de-teste';
  let jwt: JwtService;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let guard: JwtAuthGuard;

  const contextWith = (request: Record<string, unknown>) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwt = new JwtService({ secret });
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(jwt, reflector as unknown as Reflector);
  });

  it('deixa passar rota pública sem verificar token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(contextWith({ headers: {} }))).resolves.toBe(
      true,
    );
  });

  it('sem header Authorization lança 401', async () => {
    await expect(
      guard.canActivate(contextWith({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('com esquema diferente de Bearer lança 401', async () => {
    await expect(
      guard.canActivate(
        contextWith({ headers: { authorization: 'Basic abc' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('com token válido passa e anexa o payload à requisição', async () => {
    const token = await jwt.signAsync({ sub: 'user-1', role: 'MANAGER' });
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${token}` },
    };

    await expect(guard.canActivate(contextWith(request))).resolves.toBe(true);
    expect(request['user']).toMatchObject({ sub: 'user-1', role: 'MANAGER' });
  });

  it('com token vencido lança 401', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: -10 });

    await expect(
      guard.canActivate(
        contextWith({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
