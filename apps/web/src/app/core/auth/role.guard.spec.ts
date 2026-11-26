import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  PartialMatchRouteSnapshot,
  provideRouter,
  Route,
  Router,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { routes } from '../../app.routes';
import { AuthService, Role } from './auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  function run(required: Role): boolean | string {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(required)({} as Route, [] as UrlSegment[], {} as PartialMatchRouteSnapshot),
    );
    return result instanceof UrlTree ? router.serializeUrl(result) : (result as boolean);
  }

  it('libera o gerente em Cadastros', () => {
    auth.startSession('t', { name: 'Maria', role: 'MANAGER' });
    expect(run('MANAGER')).toBe(true);
  });

  it('libera o operador no Caixa', () => {
    auth.startSession('t', { name: 'Joao', role: 'OPERATOR' });
    expect(run('OPERATOR')).toBe(true);
  });

  it('desvia o operador de Cadastros para o Caixa (CA4)', () => {
    auth.startSession('t', { name: 'Joao', role: 'OPERATOR' });
    expect(run('MANAGER')).toBe('/caixa');
  });

  it('desvia o gerente do Caixa para Cadastros (CA5)', () => {
    auth.startSession('t', { name: 'Maria', role: 'MANAGER' });
    expect(run('OPERATOR')).toBe('/cadastros');
  });

  it('sem sessão, leva os dois ao login', () => {
    expect(run('MANAGER')).toBe('/login');
    expect(run('OPERATOR')).toBe('/login');
  });
});

describe('rota /operadores', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('OPERATOR navegando para /operadores é redirecionado para /caixa (CA4)', async () => {
    auth.startSession('t', { name: 'João', role: 'OPERATOR' });

    await router.navigateByUrl('/operadores');

    expect(router.url).toBe('/caixa');
  });

  it('MANAGER acessa /operadores', async () => {
    auth.startSession('t', { name: 'Maria', role: 'MANAGER' });

    await router.navigateByUrl('/operadores');

    expect(router.url).toBe('/operadores');
  });

  it('sem sessão, navegando para /operadores vai para /login', async () => {
    await router.navigateByUrl('/operadores');

    expect(router.url).toBe('/login');
  });
});

describe('rota /produtos', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('OPERATOR navegando para /produtos é redirecionado para /caixa (CA4)', async () => {
    auth.startSession('t', { name: 'João', role: 'OPERATOR' });

    await router.navigateByUrl('/produtos');

    expect(router.url).toBe('/caixa');
  });

  it('MANAGER acessa /produtos', async () => {
    auth.startSession('t', { name: 'Maria', role: 'MANAGER' });

    await router.navigateByUrl('/produtos');

    expect(router.url).toBe('/produtos');
  });

  it('sem sessão, navegando para /produtos vai para /login', async () => {
    await router.navigateByUrl('/produtos');

    expect(router.url).toBe('/login');
  });
});

describe('rota /clientes', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('OPERATOR navegando para /clientes é redirecionado para /caixa (CA5)', async () => {
    auth.startSession('t', { name: 'João', role: 'OPERATOR' });

    await router.navigateByUrl('/clientes');

    expect(router.url).toBe('/caixa');
  });

  it('MANAGER acessa /clientes', async () => {
    auth.startSession('t', { name: 'Maria', role: 'MANAGER' });

    await router.navigateByUrl('/clientes');

    expect(router.url).toBe('/clientes');
  });

  it('sem sessão, navegando para /clientes vai para /login', async () => {
    await router.navigateByUrl('/clientes');

    expect(router.url).toBe('/login');
  });
});
