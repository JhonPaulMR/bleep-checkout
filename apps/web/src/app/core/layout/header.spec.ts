import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Header } from './header';

describe('Header', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [Header], providers: [provideRouter([])] });
  });

  async function render() {
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('gerente vê Cadastros e Operadores com seus respectivos caminhos', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'Maria', role: 'MANAGER' });
    const el = await render();

    const links = Array.from(el.querySelectorAll('nav a')).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute('href'),
    }));
    expect(links).toEqual([
      { label: 'Cadastros', href: '/cadastros' },
      { label: 'Operadores', href: '/operadores' },
    ]);
  });

  it('operador vê só Caixa e não vê Operadores (CA4)', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'João', role: 'OPERATOR' });
    const el = await render();

    const links = Array.from(el.querySelectorAll('nav a')).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute('href'),
    }));
    expect(links).toEqual([{ label: 'Caixa', href: '/caixa' }]);
  });

  it('sem sessão, não mostra menu', async () => {
    const el = await render();

    expect(el.querySelectorAll('nav a').length).toBe(0);
  });
});
