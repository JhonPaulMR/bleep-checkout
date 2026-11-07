import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('guarda token e usuário no sessionStorage e nunca no localStorage', () => {
    const auth = TestBed.inject(AuthService);

    auth.startSession('token-abc', { name: 'Maria', role: 'MANAGER' });

    expect(sessionStorage.getItem('accessToken')).toBe('token-abc');
    expect(JSON.parse(sessionStorage.getItem('user')!)).toEqual({ name: 'Maria', role: 'MANAGER' });
    expect(localStorage.length).toBe(0);
    expect(auth.user()).toEqual({ name: 'Maria', role: 'MANAGER' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.token()).toBe('token-abc');
  });

  it('lê de volta a sessão gravada no sessionStorage', () => {
    sessionStorage.setItem('accessToken', 'token-xyz');
    sessionStorage.setItem('user', JSON.stringify({ name: 'João', role: 'OPERATOR' }));

    const auth = TestBed.inject(AuthService);

    expect(auth.user()).toEqual({ name: 'João', role: 'OPERATOR' });
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('sem nada gravado, não há sessão (CA7)', () => {
    const auth = TestBed.inject(AuthService);

    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('limpa a sessão', () => {
    const auth = TestBed.inject(AuthService);
    auth.startSession('token-abc', { name: 'Maria', role: 'MANAGER' });

    auth.clearSession();

    expect(sessionStorage.length).toBe(0);
    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });
});
