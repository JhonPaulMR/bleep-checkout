import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Operator, OperatorsService } from '../data/operators.service';
import { OperatorsPage } from './operators.page';

describe('OperatorsPage', () => {
  let listSpy: ReturnType<typeof vi.fn>;
  let createSpy: ReturnType<typeof vi.fn>;

  const existingOperator: Operator = {
    id: 'op-1',
    name: 'Maria Caixa',
    email: 'maria@bleep.com',
    role: 'OPERATOR',
    createdById: 'mgr-1',
    createdAt: '2026-11-21T10:00:00.000Z',
  };

  function setup(initialOperators: Operator[] | Subject<Operator[]> = []) {
    listSpy = vi.fn().mockReturnValue(
      initialOperators instanceof Subject ? initialOperators.asObservable() : of(initialOperators),
    );
    createSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [OperatorsPage],
      providers: [
        {
          provide: OperatorsService,
          useValue: { list: listSpy, create: createSpy },
        },
      ],
    });

    return TestBed.createComponent(OperatorsPage);
  }

  function fillAndSubmit(
    el: HTMLElement,
    values: { name: string; email: string; password: string },
  ) {
    const nameInput = el.querySelector<HTMLInputElement>('input[name="name"]')!;
    const emailInput = el.querySelector<HTMLInputElement>('input[name="email"]')!;
    const passwordInput = el.querySelector<HTMLInputElement>('input[name="password"]')!;

    nameInput.value = values.name;
    nameInput.dispatchEvent(new Event('input'));
    emailInput.value = values.email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = values.password;
    passwordInput.dispatchEvent(new Event('input'));

    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  }

  it('exibe mensagem de estado vazio quando não há operadores cadastrados e mantém o formulário disponível', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('Nenhum operador cadastrado ainda.');
    expect(el.querySelector('form')).not.toBeNull();
    expect(el.querySelector('input[name="name"]')).not.toBeNull();
    expect(el.querySelector('input[name="email"]')).not.toBeNull();
    expect(el.querySelector('input[name="password"]')).not.toBeNull();
    expect(el.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('exibe estado de carregamento enquanto a lista não chega e lista os operadores quando carrega', async () => {
    const list$ = new Subject<Operator[]>();
    const fixture = setup(list$);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Nenhum operador cadastrado ainda.');

    list$.next([existingOperator]);
    list$.complete();
    await fixture.whenStable();

    expect(el.textContent).toContain('Maria Caixa');
    expect(el.textContent).toContain('maria@bleep.com');
    expect(el.textContent).not.toContain('Nenhum operador cadastrado ainda.');
  });

  it('campos em branco bloqueiam envio, exibem mensagens por campo e não chamam create', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, { name: '', email: '', password: '' });
    await fixture.whenStable();

    expect(el.textContent).toContain('Informe o nome');
    expect(el.textContent).toContain('Informe o e-mail');
    expect(el.textContent).toContain('Informe a senha');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('nome apenas com espaços bloqueia envio e exibe "Informe o nome"', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, { name: '   ', email: 'joao@bleep.com', password: 'password123' });
    await fixture.whenStable();

    expect(el.textContent).toContain('Informe o nome');
    expect(el.textContent).not.toContain('Informe o e-mail');
    expect(el.textContent).not.toContain('E-mail inválido');
    expect(el.textContent).not.toContain('Informe a senha');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('e-mail inválido bloqueia envio e exibe "E-mail inválido"', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, { name: 'João Operador', email: 'email-invalido', password: 'password123' });
    await fixture.whenStable();

    expect(el.textContent).toContain('E-mail inválido');
    expect(el.textContent).not.toContain('Informe o nome');
    expect(el.textContent).not.toContain('Informe a senha');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('senha com menos de 8 caracteres bloqueia envio e exibe mensagem de tamanho mínimo', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, { name: 'João Operador', email: 'joao@bleep.com', password: '1234567' });
    await fixture.whenStable();

    expect(el.textContent).toContain('A senha deve ter pelo menos 8 caracteres');
    expect(el.textContent).not.toContain('Informe o nome');
    expect(el.textContent).not.toContain('E-mail inválido');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('envio válido chama OperatorsService.create, adiciona o operador na lista e limpa o formulário', async () => {
    const create$ = new Subject<Operator>();
    const fixture = setup([existingOperator]);
    createSpy.mockReturnValue(create$.asObservable());
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    fillAndSubmit(el, {
      name: '  João Operador  ',
      email: '  joao@bleep.com  ',
      password: 'password123',
    });
    await fixture.whenStable();

    expect(createSpy).toHaveBeenCalledWith({
      name: 'João Operador',
      email: 'joao@bleep.com',
      password: 'password123',
    });
    const submitButton = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitButton.disabled).toBe(true);

    const created: Operator = {
      id: 'op-2',
      name: 'João Operador',
      email: 'joao@bleep.com',
      role: 'OPERATOR',
      createdById: 'mgr-1',
      createdAt: '2026-11-21T11:00:00.000Z',
    };
    create$.next(created);
    create$.complete();
    await fixture.whenStable();

    expect(submitButton.disabled).toBe(false);
    expect(el.textContent).toContain('João Operador');
    expect(el.textContent).toContain('joao@bleep.com');
    expect(el.textContent).toContain('Maria Caixa');

    const items = Array.from(el.querySelectorAll('li'));
    expect(items[0]?.textContent).toContain('João Operador');
    expect(items[1]?.textContent).toContain('Maria Caixa');

    expect(el.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe('');
    expect(el.querySelector<HTMLInputElement>('input[name="email"]')!.value).toBe('');
    expect(el.querySelector<HTMLInputElement>('input[name="password"]')!.value).toBe('');
    expect(el.textContent).not.toContain('Informe o nome');
    expect(el.textContent).not.toContain('Informe o e-mail');
    expect(el.textContent).not.toContain('Informe a senha');
  });
});
