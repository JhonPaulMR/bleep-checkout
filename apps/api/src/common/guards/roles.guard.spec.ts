import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../generated/prisma/enums.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let guard: RolesGuard;

  const contextWith = (request: Record<string, unknown>) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite rota sem @Roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextWith({ user: { sub: 'u1', role: Role.OPERATOR } }))).toBe(
      true,
    );
  });

  it('permite rota com @Roles vazio', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(contextWith({ user: { sub: 'u1', role: Role.OPERATOR } }))).toBe(
      true,
    );
  });

  it('permite MANAGER em rota com @Roles(Role.MANAGER)', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MANAGER]);

    expect(guard.canActivate(contextWith({ user: { sub: 'u1', role: Role.MANAGER } }))).toBe(
      true,
    );
  });

  it('recusa OPERATOR em rota com @Roles(Role.MANAGER)', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MANAGER]);

    expect(guard.canActivate(contextWith({ user: { sub: 'u1', role: Role.OPERATOR } }))).toBe(
      false,
    );
  });

  it('recusa MANAGER em rota com @Roles(Role.OPERATOR) (comparação estrita)', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.OPERATOR]);

    expect(guard.canActivate(contextWith({ user: { sub: 'u1', role: Role.MANAGER } }))).toBe(
      false,
    );
  });

  it('recusa quando request.user está ausente sem lançar erro', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.MANAGER]);

    expect(guard.canActivate(contextWith({}))).toBe(false);
  });
});
