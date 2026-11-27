import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Header } from './header';

describe('Header', () => {
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [Header], providers: [provideRouter([])] });
    router = TestBed.inject(Router);
  });

  async function render() {
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('gerente vê Produtos, Clientes e Operadores com seus respectivos caminhos', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'Maria', role: 'MANAGER' });
    const el = await render();

    const links = Array.from(el.querySelectorAll('nav a')).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute('href'),
    }));
    expect(links).toEqual([
      { label: 'Produtos', href: '/produtos' },
      { label: 'Clientes', href: '/clientes' },
      { label: 'Operadores', href: '/operadores' },
    ]);
  });

  it('operador vê Caixa e Vendas pendentes e não vê Clientes, Produtos nem Operadores (CA1)', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'João', role: 'OPERATOR' });
    const el = await render();

    const links = Array.from(el.querySelectorAll('nav a')).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute('href'),
    }));
    expect(links).toEqual([
      { label: 'Caixa', href: '/caixa' },
      { label: 'Vendas pendentes', href: '/pendentes' },
    ]);
    expect(links.some((l) => l.label === 'Clientes')).toBe(false);
    expect(links.some((l) => l.label === 'Produtos')).toBe(false);
    expect(links.some((l) => l.label === 'Operadores')).toBe(false);
  });

  it('exibe nome do usuário e papel em português para gerente', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'Maria Silva', role: 'MANAGER' });
    const el = await render();

    expect(el.textContent).toContain('Maria Silva');
    expect(el.textContent).toContain('Gerente');
  });

  it('exibe nome do usuário e papel em português para operador', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'João Souza', role: 'OPERATOR' });
    const el = await render();

    expect(el.textContent).toContain('João Souza');
    expect(el.textContent).toContain('Operador de caixa');
  });

  it('botão Sair encerra a sessão e redireciona para /login', async () => {
    const auth = TestBed.inject(AuthService);
    auth.startSession('t', { name: 'Maria', role: 'MANAGER' });
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const clearSessionSpy = vi.spyOn(auth, 'clearSession');

    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const logoutBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Sair',
    );
    expect(logoutBtn).toBeDefined();
    logoutBtn?.click();

    expect(clearSessionSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('sem sessão, não mostra menu', async () => {
    const el = await render();

    expect(el.querySelectorAll('nav a').length).toBe(0);
    expect(el.querySelector('header')).toBeNull();
  });
});
