import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

export const AREA_BY_ROLE: Record<Role, string> = {
  MANAGER: '/cadastros',
  OPERATOR: '/caixa',
};

/** Deixa passar só o papel da rota; os demais voltam à própria área, e sem sessão vão ao login. */
export function roleGuard(required: Role): CanMatchFn {
  return () => {
    const user = inject(AuthService).user();
    const router = inject(Router);
    if (!user) return router.parseUrl('/login');
    return user.role === required ? true : router.parseUrl(AREA_BY_ROLE[user.role]);
  };
}
