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

  it('gerente vê só Cadastros', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'Maria', role: 'MANAGER' });
    const el = await render();

    const links = Array.from(el.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
    expect(links).toEqual(['Cadastros']);
  });

  it('operador vê só Caixa', async () => {
    TestBed.inject(AuthService).startSession('t', { name: 'João', role: 'OPERATOR' });
    const el = await render();

    const links = Array.from(el.querySelectorAll('nav a')).map((a) => a.textContent?.trim());
    expect(links).toEqual(['Caixa']);
  });

  it('sem sessão, não mostra menu', async () => {
    const el = await render();

    expect(el.querySelectorAll('nav a').length).toBe(0);
  });
});
