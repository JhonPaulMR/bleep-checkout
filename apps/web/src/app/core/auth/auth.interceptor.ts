import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { IdleSessionService } from './idle-session.service';

const LOGIN_PATH = '/auth/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const idle = inject(IdleSessionService);
  const isLogin = req.url.endsWith(LOGIN_PATH);

  // Nenhuma ação sai com a sessão vencida (CA6).
  if (!isLogin && idle.isExpired()) {
    idle.expire();
    return throwError(
      () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', url: req.url }),
    );
  }

  const token = inject(AuthService).token();
  const authorized = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      // O 401 do próprio login é credencial inválida e fica com a página (CA2).
      if (!isLogin && error instanceof HttpErrorResponse && error.status === 401) {
        idle.expire();
      }
      return throwError(() => error);
    }),
  );
};
