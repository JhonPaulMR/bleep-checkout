import { TestBed } from '@angular/core/testing';
import { PartialMatchRouteSnapshot, Route, Router, UrlSegment, UrlTree } from '@angular/router';
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
