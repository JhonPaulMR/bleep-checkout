import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { IDLE_LIMIT_MS, IdleSessionService } from './idle-session.service';

describe('IdleSessionService', () => {
  let auth: AuthService;
  let idle: IdleSessionService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    auth = TestBed.inject(AuthService);
    idle = TestBed.inject(IdleSessionService);
    idle.start();
    auth.startSession('tok', { name: 'Maria', role: 'MANAGER' });
    TestBed.tick();
  });

  afterEach(() => vi.useRealTimers());

  it('30 minutos sem uso limpam a sessão e levam ao login com o aviso', () => {
    vi.advanceTimersByTime(IDLE_LIMIT_MS);

    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('uso antes dos 30 minutos reinicia o prazo', () => {
    vi.advanceTimersByTime(IDLE_LIMIT_MS - 1000);
    document.dispatchEvent(new Event('click'));
    vi.advanceTimersByTime(IDLE_LIMIT_MS - 1000);

    expect(auth.isAuthenticated()).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('isExpired é verdadeiro na primeira ação depois do prazo, mesmo sem o timer disparar', () => {
    vi.setSystemTime(Date.now() + IDLE_LIMIT_MS);

    expect(idle.isExpired()).toBe(true);
  });

  it('expire sem timer limpa a sessão e avisa', () => {
    idle.expire();

    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
