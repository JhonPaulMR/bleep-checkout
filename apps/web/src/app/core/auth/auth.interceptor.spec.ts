import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

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
});
