import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let controller: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    controller = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  async function entrar(role: 'MANAGER' | 'OPERATOR') {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const email = el.querySelector<HTMLInputElement>('input[type=email]')!;
    const senha = el.querySelector<HTMLInputElement>('input[type=password]')!;
    email.value = 'pessoa@bleep.com';
    email.dispatchEvent(new Event('input'));
    senha.value = 'segredo123';
    senha.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    const req = controller.expectOne((r) => r.url.endsWith('/auth/login'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'pessoa@bleep.com', password: 'segredo123' });
    req.flush({ data: { accessToken: 'tok', user: { name: 'Pessoa', role } } });
    await fixture.whenStable();
  }

  it('tem o botão "Entrar"', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.textContent).toContain(
      'Entrar',
    );
  });

  it('gerente é levado à área de Cadastros e a sessão é gravada', async () => {
    await entrar('MANAGER');

    expect(navigate).toHaveBeenCalledWith('/cadastros');
    expect(TestBed.inject(AuthService).user()).toEqual({ name: 'Pessoa', role: 'MANAGER' });
    expect(sessionStorage.getItem('accessToken')).toBe('tok');
  });

  it('operador é levado à área do Caixa', async () => {
    await entrar('OPERATOR');

    expect(navigate).toHaveBeenCalledWith('/caixa');
  });
});
