import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { SessionUser } from '../../../core/auth/auth.service';
import { API_URL } from '../../../core/config/api-url';

export interface LoginResult {
  accessToken: string;
  user: SessionUser;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  login(email: string, password: string): Observable<LoginResult> {
    return this.http
      .post<{ data: LoginResult }>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(map((response) => response.data));
  }
}
