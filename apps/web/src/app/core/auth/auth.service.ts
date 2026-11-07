import { computed, Injectable, signal } from '@angular/core';

export type Role = 'MANAGER' | 'OPERATOR';

export interface SessionUser {
  name: string;
  role: Role;
}

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

/** Sessão guardada só no sessionStorage: fechar a aba ou o navegador a encerra (CA7). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));
  private readonly userState = signal<SessionUser | null>(this.readUser());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== null && this.userState() !== null);

  startSession(accessToken: string, user: SessionUser): void {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this.tokenState.set(accessToken);
    this.userState.set(user);
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.tokenState.set(null);
    this.userState.set(null);
  }

  private readUser(): SessionUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }
}
