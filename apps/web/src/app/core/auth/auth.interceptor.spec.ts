import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { IDLE_LIMIT_MS, IdleSessionService } from './idle-session.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let idle: IdleSessionService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    idle = TestBed.inject(IdleSessionService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => vi.useRealTimers());

  it('anexa Authorization: Bearer quando há token', () => {
    auth.startSession('token-abc', { name: 'Maria', role: 'MANAGER' });

    http.get('/qualquer').subscribe();

    const req = controller.expectOne('/qualquer');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-abc');
  });

  it('não anexa nada quando não há token', () => {
    http.get('/qualquer').subscribe();

    const req = controller.expectOne('/qualquer');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('resposta 401 limpa a sessão e leva ao login com o aviso', () => {
    auth.startSession('token-abc', { name: 'Maria', role: 'MANAGER' });
    const onError = vi.fn();

    http.get('/qualquer').subscribe({ error: onError });
    controller.expectOne('/qualquer').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(onError).toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('o 401 do /auth/login chega à página sem aviso nem redirecionamento', () => {
    const onError = vi.fn();

    http.post('/auth/login', {}).subscribe({ error: onError });
    controller.expectOne('/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(onError).toHaveBeenCalled();
    expect(idle.expired()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('primeira ação depois de 30 minutos sem uso não sai: sessão encerrada e login', () => {
    vi.useFakeTimers();
    auth.startSession('token-abc', { name: 'Maria', role: 'MANAGER' });
    idle.touch();
    vi.setSystemTime(Date.now() + IDLE_LIMIT_MS);
    const onError = vi.fn();

    http.get('/qualquer').subscribe({ error: onError });

    controller.expectNone('/qualquer');
    expect(onError).toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
