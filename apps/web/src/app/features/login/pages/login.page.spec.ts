import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { IdleSessionService } from '../../../core/auth/idle-session.service';
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

  async function tentar(emailDigitado: string, senhaDigitada: string) {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const email = el.querySelector<HTMLInputElement>('input[type=email]')!;
    const senha = el.querySelector<HTMLInputElement>('input[type=password]')!;
    email.value = emailDigitado;
    email.dispatchEvent(new Event('input'));
    senha.value = senhaDigitada;
    senha.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    return el;
  }

  it('campos em branco mostram as mensagens e nenhuma requisição sai', async () => {
    const el = await tentar('', '');

    expect(el.textContent).toContain('Informe o e-mail');
    expect(el.textContent).toContain('Informe a senha');
    controller.expectNone((r) => r.url.endsWith('/auth/login'));
  });

  it('e-mail em formato inválido mostra "E-mail inválido" e nenhuma requisição sai', async () => {
    const el = await tentar('pessoa-sem-arroba', 'segredo123');

    expect(el.textContent).toContain('E-mail inválido');
    expect(el.textContent).not.toContain('Informe a senha');
    controller.expectNone((r) => r.url.endsWith('/auth/login'));
  });

  it('entrada válida não mostra mensagem de campo', async () => {
    const el = await tentar('pessoa@bleep.com', 'segredo123');

    expect(el.textContent).not.toContain('Informe');
    expect(el.textContent).not.toContain('E-mail inválido');
    controller.expectOne((r) => r.url.endsWith('/auth/login'));
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

  async function enviarEResponder(responder: (req: TestRequest) => void) {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const email = el.querySelector<HTMLInputElement>('input[type=email]')!;
    const senha = el.querySelector<HTMLInputElement>('input[type=password]')!;
    email.value = 'pessoa@bleep.com';
    email.dispatchEvent(new Event('input'));
    senha.value = 'senha-errada';
    senha.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.querySelector('button')!.disabled).toBe(true);

    responder(controller.expectOne((r) => r.url.endsWith('/auth/login')));
    await fixture.whenStable();
    return { el, email };
  }

  it('resposta 401 mostra "E-mail ou senha inválidos." e mantém o e-mail', async () => {
    const { el, email } = await enviarEResponder((req) =>
      req.flush(
        { statusCode: 401, message: 'E-mail ou senha inválidos.' },
        { status: 401, statusText: 'Unauthorized' },
      ),
    );

    expect(el.textContent).toContain('E-mail ou senha inválidos.');
    expect(email.value).toBe('pessoa@bleep.com');
    expect(el.querySelector('button')!.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('erro de rede mostra "Não foi possível conectar. Tente novamente." e mantém o e-mail', async () => {
    const { el, email } = await enviarEResponder((req) => req.error(new ProgressEvent('error')));

    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).not.toContain('E-mail ou senha inválidos.');
    expect(email.value).toBe('pessoa@bleep.com');
    expect(el.querySelector('button')!.disabled).toBe(false);
  });

  it('mostra "Sua sessão expirou. Entre novamente." quando a sessão foi encerrada', async () => {
    TestBed.inject(IdleSessionService).expire();
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Sua sessão expirou. Entre novamente.',
    );
  });

  it('sem sessão encerrada, não mostra o aviso de expiração', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Sua sessão expirou');
  });

  it('401 do próprio login não mostra o aviso de expiração', async () => {
    const { el } = await enviarEResponder((req) =>
      req.flush({}, { status: 401, statusText: 'Unauthorized' }),
    );

    expect(el.textContent).not.toContain('Sua sessão expirou');
  });
});
