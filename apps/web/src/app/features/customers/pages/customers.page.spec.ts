import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { AuthService } from '../../../core/auth/auth.service';
import { IdleSessionService } from '../../../core/auth/idle-session.service';
import { API_URL } from '../../../core/config/api-url';
import { CreateCustomerPayload, Customer, CustomersService } from '../data/customers.service';
import { CustomersPage } from './customers.page';

describe('CustomersPage', () => {
  let listSpy: ReturnType<typeof vi.fn>;
  let createSpy: ReturnType<typeof vi.fn>;
  let addCreditSpy: ReturnType<typeof vi.fn>;

  const mariaCustomer: Customer = {
    id: 'cust-1',
    name: 'Maria Silva',
    cpf: '12345678901',
    balanceCents: 15000,
    createdAt: '2026-11-21T10:00:00.000Z',
  };

  const joaoCustomer: Customer = {
    id: 'cust-2',
    name: 'João Souza',
    cpf: '98765432100',
    balanceCents: 5050,
    createdAt: '2026-11-21T11:00:00.000Z',
  };

  const zeroBalanceCustomer: Customer = {
    id: 'cust-3',
    name: 'Ana Costa',
    cpf: '11122233344',
    balanceCents: 0,
    createdAt: '2026-11-21T12:00:00.000Z',
  };

  function setup(
    initialCustomers: Customer[] | Observable<Customer[]> = [],
    createImpl: (payload: CreateCustomerPayload) => Observable<Customer> = (payload) =>
      of({
        id: 'cust-new',
        name: payload.name,
        cpf: payload.cpf,
        balanceCents: payload.balanceCents,
        createdAt: '2026-11-25T12:00:00.000Z',
      }),
    addCreditImpl: (customerId: string, amountCents: number) => Observable<Customer> = (
      customerId,
      amountCents,
    ) =>
      of({
        ...mariaCustomer,
        id: customerId,
        balanceCents: mariaCustomer.balanceCents + amountCents,
      }),
  ) {
    listSpy = vi.fn().mockReturnValue(
      Array.isArray(initialCustomers) ? of(initialCustomers) : initialCustomers,
    );
    createSpy = vi.fn().mockImplementation(createImpl);
    addCreditSpy = vi.fn().mockImplementation(addCreditImpl);

    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        {
          provide: CustomersService,
          useValue: { list: listSpy, create: createSpy, addCredit: addCreditSpy },
        },
      ],
    });

    return TestBed.createComponent(CustomersPage);
  }

  it('exibe estado de carregamento enquanto a lista não chega e renderiza a tabela com CPF formatado, saldo em BRL e botão + Adicionar crédito habilitado', async () => {
    const list$ = new Subject<Customer[]>();
    const fixture = setup(list$);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Carregando clientes...');
    expect(el.textContent).not.toContain('Nenhum cliente cadastrado ainda.');

    list$.next([mariaCustomer, zeroBalanceCustomer]);
    list$.complete();
    await fixture.whenStable();

    expect(el.textContent).not.toContain('Carregando clientes...');
    expect(el.textContent).toContain('Maria Silva');
    expect(el.textContent).toContain('123.456.789-01');
    expect(el.textContent).toContain('R$\u00a0150,00');
    expect(el.textContent).toContain('Ana Costa');
    expect(el.textContent).toContain('111.222.333-44');
    expect(el.textContent).toContain('R$\u00a00,00');

    const addCreditButtons = Array.from(el.querySelectorAll<HTMLButtonElement>('tbody button')).filter(
      (btn) => btn.textContent?.includes('Adicionar crédito'),
    );
    expect(addCreditButtons).toHaveLength(2);
    expect(addCreditButtons[0].disabled).toBe(false);
    expect(addCreditButtons[0].getAttribute('data-testid')).toBe(`add-credit-${mariaCustomer.id}`);
    expect(addCreditButtons[1].disabled).toBe(false);
    expect(addCreditButtons[1].getAttribute('data-testid')).toBe(
      `add-credit-${zeroBalanceCustomer.id}`,
    );
  });

  it('calcula e exibe os 3 cards de resumo em tempo real', async () => {
    const fixture = setup([mariaCustomer, joaoCustomer, zeroBalanceCustomer]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const totalCredit = el.querySelector('[data-testid="stat-total-credit"]');
    const totalCustomers = el.querySelector('[data-testid="stat-total-customers"]');
    const positiveBalance = el.querySelector('[data-testid="stat-positive-balance"]');

    expect(totalCredit?.textContent?.trim()).toBe('R$\u00a0200,50');
    expect(totalCustomers?.textContent?.trim()).toBe('3');
    expect(positiveBalance?.textContent?.trim()).toBe('2');

    expect(el.textContent).toContain('2 clientes com saldo positivo');
    expect(el.textContent).toContain('1 com saldo zerado');
  });

  it('filtra clientes localmente por nome (case-insensitive) e por CPF com ou sem pontuação', async () => {
    const fixture = setup([mariaCustomer, joaoCustomer, zeroBalanceCustomer]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const searchInput = el.querySelector<HTMLInputElement>(
      '[data-testid="customer-search-input"]',
    )!;
    expect(searchInput).not.toBeNull();

    // Busca por nome com espaços e caixa mista
    searchInput.value = '  maria  ';
    searchInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('Maria Silva');
    expect(el.textContent).not.toContain('João Souza');
    expect(el.textContent).not.toContain('Ana Costa');

    // Busca por CPF sem pontuação
    searchInput.value = '987654';
    searchInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('João Souza');
    expect(el.textContent).not.toContain('Maria Silva');

    // Busca por CPF com pontuação
    searchInput.value = '111.222.333-44';
    searchInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('Ana Costa');
    expect(el.textContent).not.toContain('João Souza');
  });

  it('exibe estado vazio quando não há clientes cadastrados e mantém botão + Novo Cliente disponível', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('Nenhum cliente cadastrado ainda.');

    const newCustomerButton = el.querySelector<HTMLButtonElement>(
      '[data-testid="open-new-customer-modal"]',
    );
    expect(newCustomerButton).not.toBeNull();
    expect(newCustomerButton?.disabled).toBe(false);
    expect(newCustomerButton?.textContent).toContain('Novo Cliente');
  });

  it('exibe estado vazio de busca quando nenhum cliente corresponde ao termo e mantém botão + Novo Cliente disponível', async () => {
    const fixture = setup([mariaCustomer]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const searchInput = el.querySelector<HTMLInputElement>(
      '[data-testid="customer-search-input"]',
    )!;
    searchInput.value = 'inexistente';
    searchInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('Nenhum cliente encontrado para a busca.');
    expect(el.textContent).not.toContain('Nenhum cliente cadastrado ainda.');

    const newCustomerButton = el.querySelector<HTMLButtonElement>(
      '[data-testid="open-new-customer-modal"]',
    );
    expect(newCustomerButton).not.toBeNull();
    expect(newCustomerButton?.disabled).toBe(false);
  });

  it('exibe listError em [role="alert"] e não exibe estado vazio quando a listagem falha', async () => {
    const fixture = setup(throwError(() => new Error('Network error')));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const alertEl = el.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).not.toContain('Nenhum cliente cadastrado ainda.');
  });

  it('não exibe listError quando a API retorna 401 na listagem', async () => {
    const fixture = setup(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            statusText: 'Unauthorized',
          }),
      ),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Carregando clientes...');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('abre o modal pelo botão + Novo Cliente com saldo inicial padrão 0,00 e fecha por Cancelar ou X sem chamar CustomersService.create', async () => {
    const fixture = setup([mariaCustomer]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();

    const modal = el.querySelector('[data-testid="customer-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.getAttribute('role')).toBe('dialog');
    expect(modal?.getAttribute('aria-modal')).toBe('true');
    expect(modal?.textContent).toContain('Cadastrar Cliente');
    expect(modal?.textContent).toContain('Preencha os dados e configure o crédito inicial');
    expect(modal?.textContent).toContain(
      'O valor inserido será imediatamente provisionado como limite disponível no caixa.',
    );

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!;
    const cpfInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!;
    const balanceInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-customer-balance"]',
    )!;
    expect(nameInput.value).toBe('');
    expect(cpfInput.value).toBe('');
    expect(balanceInput.value).toBe('0,00');

    nameInput.value = 'Cliente Abandonado';
    nameInput.dispatchEvent(new Event('input'));
    cpfInput.value = '123.456.789-01';
    cpfInput.dispatchEvent(new Event('input'));
    balanceInput.value = '50,00';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('[data-testid="cancel-customer-modal"]')!.click();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();

    // Reabre e verifica reset dos campos; fecha pelo botão X
    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!.value).toBe(
      '',
    );
    expect(el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!.value).toBe('');
    expect(
      el.querySelector<HTMLInputElement>('[data-testid="input-customer-balance"]')!.value,
    ).toBe('0,00');

    el.querySelector<HTMLButtonElement>('[data-testid="close-customer-modal"]')!.click();
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('bloqueia envio e exibe erros inline para nome vazio, CPF ausente/inválido e saldo vazio/negativo/inválido', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!;
    const cpfInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!;
    const balanceInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-customer-balance"]',
    )!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="customer-modal"] form')!;

    // Limpa o saldo padrão para validar mensagem de campo vazio
    balanceInput.value = '   ';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe o nome do cliente.');
    expect(el.textContent).toContain('Informe o CPF.');
    expect(el.textContent).toContain('Informe o saldo inicial.');

    // Nome apenas espaços, CPF inválido e saldo negativo
    nameInput.value = '   ';
    nameInput.dispatchEvent(new Event('input'));
    cpfInput.value = '123.456.789-0';
    cpfInput.dispatchEvent(new Event('input'));
    balanceInput.value = '-10,00';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe o nome do cliente.');
    expect(el.textContent).toContain('Informe um CPF válido com 11 dígitos numéricos.');
    expect(el.textContent).toContain('O saldo inicial não pode ser negativo.');

    // Saldo não numérico também bloqueia
    balanceInput.value = 'abc';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('O saldo inicial não pode ser negativo.');
  });

  it('envia cliente válido normalizando CPF para 11 dígitos e balanceCents, bloqueia fechamento durante Salvando..., atualiza lista ordenada e cards de resumo', async () => {
    const create$ = new Subject<Customer>();
    const fixture = setup([mariaCustomer], () => create$);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!;
    const cpfInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!;
    const balanceInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-customer-balance"]',
    )!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-customer"]')!;
    const cancelButton = el.querySelector<HTMLButtonElement>(
      '[data-testid="cancel-customer-modal"]',
    )!;
    const closeButton = el.querySelector<HTMLButtonElement>(
      '[data-testid="close-customer-modal"]',
    )!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="customer-modal"] form')!;

    nameInput.value = '  Bruno Almeida  ';
    nameInput.dispatchEvent(new Event('input'));
    cpfInput.value = '222.333.444-55';
    cpfInput.dispatchEvent(new Event('input'));
    balanceInput.value = '100,00';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({
      name: 'Bruno Almeida',
      cpf: '22233344455',
      balanceCents: 10000,
    });
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain('Salvando...');
    expect(cancelButton.disabled).toBe(true);
    expect(closeButton.disabled).toBe(true);

    // Tentativa de fechar ou reenviar durante saving não fecha nem duplica chamada
    closeButton.click();
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="customer-modal"]')).not.toBeNull();
    expect(createSpy).toHaveBeenCalledTimes(1);

    const createdCustomer: Customer = {
      id: 'cust-4',
      name: 'Bruno Almeida',
      cpf: '22233344455',
      balanceCents: 10000,
      createdAt: '2026-11-25T13:00:00.000Z',
    };
    create$.next(createdCustomer);
    create$.complete();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();
    expect(el.querySelector('[data-testid="stat-total-credit"]')?.textContent?.trim()).toBe(
      'R$\u00a0250,00',
    );
    expect(el.querySelector('[data-testid="stat-total-customers"]')?.textContent?.trim()).toBe('2');
    expect(el.querySelector('[data-testid="stat-positive-balance"]')?.textContent?.trim()).toBe(
      '2',
    );

    const rows = Array.from(el.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Bruno Almeida');
    expect(rows[1].textContent).toContain('Maria Silva');
  });

  it('aceita saldo inicial 0,00 no envio com sucesso', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!;
    const cpfInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="customer-modal"] form')!;

    nameInput.value = 'Carlos Zero';
    nameInput.dispatchEvent(new Event('input'));
    cpfInput.value = '33344455566';
    cpfInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).toHaveBeenCalledWith({
      name: 'Carlos Zero',
      cpf: '33344455566',
      balanceCents: 0,
    });
    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();
  });

  it('409 no cadastro exibe mensagem de CPF duplicado com ícone de erro, borda de perigo e mantém campos preenchidos', async () => {
    const fixture = setup([mariaCustomer]);
    createSpy.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { message: 'Já existe um cliente com este CPF.' },
          }),
      ),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!;
    const cpfInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!;
    const balanceInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-customer-balance"]',
    )!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-customer"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="customer-modal"] form')!;

    nameInput.value = 'Maria Duplicada';
    nameInput.dispatchEvent(new Event('input'));
    cpfInput.value = '12345678901';
    cpfInput.dispatchEvent(new Event('input'));
    balanceInput.value = '50,00';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toContain('Salvar');
    expect(el.querySelector('[data-testid="customer-modal"]')).not.toBeNull();

    // Mensagem de conflito 409 com ícone de erro e alert
    expect(el.textContent).toContain('Já existe um cliente com este CPF.');
    const alert = el.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Já existe um cliente com este CPF.');
    expect(alert?.textContent).toContain('error');

    // Borda de erro no input de CPF
    expect(cpfInput.classList.contains('border-perigo')).toBe(true);
    expect(cpfInput.classList.contains('border-2')).toBe(true);

    // Campos mantidos preenchidos para correção
    expect(nameInput.value).toBe('Maria Duplicada');
    expect(cpfInput.value).toBe('12345678901');
    expect(balanceInput.value).toBe('50,00');

    // Alterar o campo CPF limpa o erro de conflito
    cpfInput.value = '12345678902';
    cpfInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).not.toContain('Já existe um cliente com este CPF.');
    expect(cpfInput.classList.contains('border-perigo')).toBe(false);
  });

  it('falha de rede no cadastro exibe mensagem de conexão, mantém campos preenchidos e retira botão do carregamento', async () => {
    const fixture = setup([], () =>
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!;
    const cpfInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!;
    const balanceInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-customer-balance"]',
    )!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-customer"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="customer-modal"] form')!;

    nameInput.value = 'Carlos Falha';
    nameInput.dispatchEvent(new Event('input'));
    cpfInput.value = '55566677788';
    cpfInput.dispatchEvent(new Event('input'));
    balanceInput.value = '25,00';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="customer-modal"]')).not.toBeNull();
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toContain('Salvar');
    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível conectar. Tente novamente.',
    );
    expect(nameInput.value).toBe('Carlos Falha');
    expect(cpfInput.value).toBe('55566677788');
    expect(balanceInput.value).toBe('25,00');
  });

  it('401 no envio do cadastro dispara authInterceptor, limpa sessão, leva ao login com aviso e não adiciona cliente', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const controller = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);
    const idle = TestBed.inject(IdleSessionService);
    const apiUrl = TestBed.inject(API_URL);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    auth.startSession('expired-token', { name: 'Gerente', role: 'MANAGER' });

    const fixture = TestBed.createComponent(CustomersPage);
    fixture.detectChanges();

    const listReq = controller.expectOne(`${apiUrl}/customers`);
    expect(listReq.request.method).toBe('GET');
    listReq.flush({ data: [mariaCustomer] });
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('[data-testid="open-new-customer-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-name"]')!;
    const cpfInput = el.querySelector<HTMLInputElement>('[data-testid="input-customer-cpf"]')!;
    const balanceInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-customer-balance"]',
    )!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="customer-modal"] form')!;

    nameInput.value = 'Cliente Expirado';
    nameInput.dispatchEvent(new Event('input'));
    cpfInput.value = '44455566677';
    cpfInput.dispatchEvent(new Event('input'));
    balanceInput.value = '10,00';
    balanceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));

    const createReq = controller.expectOne(`${apiUrl}/customers`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush(
      { statusCode: 401, message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();

    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(el.textContent).not.toContain('Cliente Expirado');
    expect(el.textContent).not.toContain('Não foi possível conectar. Tente novamente.');
    expect(el.querySelector<HTMLButtonElement>('[data-testid="submit-customer"]')?.disabled).toBe(
      false,
    );

    controller.verify();
    sessionStorage.clear();
  });

  it('abre o modal de recarga com nome, saldo atual e prévia "—" e fecha por Cancelar ou X sem chamar addCredit (CA8)', async () => {
    const fixture = setup([mariaCustomer]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="credit-modal"]')).toBeNull();

    el.querySelector<HTMLButtonElement>(`[data-testid="add-credit-${mariaCustomer.id}"]`)!.click();
    await fixture.whenStable();

    const modal = el.querySelector('[data-testid="credit-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.getAttribute('role')).toBe('dialog');
    expect(modal?.getAttribute('aria-modal')).toBe('true');
    expect(modal?.textContent).toContain(`Adicionar crédito — ${mariaCustomer.name}`);
    expect(modal?.textContent).toContain('Saldo atual');
    expect(modal?.textContent).toContain('R$\u00a0150,00');

    const preview = el.querySelector('[data-testid="credit-balance-preview"]');
    expect(preview?.textContent?.trim()).toBe('—');

    const amountInput = el.querySelector<HTMLInputElement>('[data-testid="input-credit-amount"]')!;
    amountInput.value = '50,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('[data-testid="cancel-credit-modal"]')!.click();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="credit-modal"]')).toBeNull();
    expect(addCreditSpy).not.toHaveBeenCalled();

    // Reabre e verifica que o campo foi resetado; fecha pelo X
    el.querySelector<HTMLButtonElement>(`[data-testid="add-credit-${mariaCustomer.id}"]`)!.click();
    await fixture.whenStable();

    expect(el.querySelector<HTMLInputElement>('[data-testid="input-credit-amount"]')!.value).toBe(
      '',
    );
    expect(el.querySelector('[data-testid="credit-balance-preview"]')?.textContent?.trim()).toBe(
      '—',
    );

    el.querySelector<HTMLButtonElement>('[data-testid="close-credit-modal"]')!.click();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="credit-modal"]')).toBeNull();
    expect(addCreditSpy).not.toHaveBeenCalled();
  });

  it('atualiza dinamicamente a prévia "Saldo após" para valor válido e exibe "—" para 0,00 ou negativo', async () => {
    const customer250: Customer = { ...mariaCustomer, balanceCents: 25000 };
    const fixture = setup([customer250]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>(`[data-testid="add-credit-${customer250.id}"]`)!.click();
    await fixture.whenStable();

    const amountInput = el.querySelector<HTMLInputElement>('[data-testid="input-credit-amount"]')!;
    const preview = el.querySelector('[data-testid="credit-balance-preview"]')!;
    expect(preview.textContent?.trim()).toBe('—');

    amountInput.value = '50,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(preview.textContent?.trim()).toBe('R$\u00a0300,00');

    amountInput.value = '0,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(preview.textContent?.trim()).toBe('—');

    amountInput.value = '-10,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(preview.textContent?.trim()).toBe('—');
  });

  it('bloqueia envio e exibe erro inline com borda border-perigo para vazio, 0,00 e -10,00 (CA2)', async () => {
    const fixture = setup([mariaCustomer]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>(`[data-testid="add-credit-${mariaCustomer.id}"]`)!.click();
    await fixture.whenStable();

    const amountInput = el.querySelector<HTMLInputElement>('[data-testid="input-credit-amount"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="credit-modal"] form')!;

    // Vazio
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(addCreditSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe um valor maior que zero. O saldo não foi alterado.');
    expect(amountInput.classList.contains('border-perigo')).toBe(true);

    // Zero
    amountInput.value = '0,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(addCreditSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe um valor maior que zero. O saldo não foi alterado.');
    expect(amountInput.classList.contains('border-perigo')).toBe(true);

    // Negativo
    amountInput.value = '-10,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(addCreditSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe um valor maior que zero. O saldo não foi alterado.');
    expect(amountInput.classList.contains('border-perigo')).toBe(true);
  });

  it('envia recarga válida, exibe estado "Adicionando...", atualiza saldo na tabela e no card Total em Créditos Ativos e fecha o modal (CA1)', async () => {
    const addCredit$ = new Subject<Customer>();
    const fixture = setup([mariaCustomer, joaoCustomer], undefined, () => addCredit$);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>(`[data-testid="add-credit-${mariaCustomer.id}"]`)!.click();
    await fixture.whenStable();

    const amountInput = el.querySelector<HTMLInputElement>('[data-testid="input-credit-amount"]')!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-credit"]')!;
    const cancelButton = el.querySelector<HTMLButtonElement>('[data-testid="cancel-credit-modal"]')!;
    const closeButton = el.querySelector<HTMLButtonElement>('[data-testid="close-credit-modal"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="credit-modal"] form')!;

    amountInput.value = '50,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(addCreditSpy).toHaveBeenCalledTimes(1);
    expect(addCreditSpy).toHaveBeenCalledWith(mariaCustomer.id, 5000);
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain('Adicionando...');
    expect(cancelButton.disabled).toBe(true);
    expect(closeButton.disabled).toBe(true);

    // Tentativa de fechar durante creditSaving não fecha
    closeButton.click();
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="credit-modal"]')).not.toBeNull();

    addCredit$.next({
      ...mariaCustomer,
      balanceCents: 20000,
    });
    addCredit$.complete();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="credit-modal"]')).toBeNull();
    // Maria (200,00) + João (50,50) = 250,50
    expect(el.querySelector('[data-testid="stat-total-credit"]')?.textContent?.trim()).toBe(
      'R$\u00a0250,50',
    );
    const mariaRow = Array.from(el.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('Maria Silva'),
    );
    expect(mariaRow?.textContent).toContain('R$\u00a0200,00');
  });

  it('falha de rede na recarga exibe mensagem de conexão, mantém valor digitado e retira carregamento (CA7)', async () => {
    const fixture = setup([mariaCustomer], undefined, () =>
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>(`[data-testid="add-credit-${mariaCustomer.id}"]`)!.click();
    await fixture.whenStable();

    const amountInput = el.querySelector<HTMLInputElement>('[data-testid="input-credit-amount"]')!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-credit"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="credit-modal"] form')!;

    amountInput.value = '50,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="credit-modal"]')).not.toBeNull();
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toContain('Adicionar crédito');
    expect(amountInput.value).toBe('50,00');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível conectar. Tente novamente.',
    );
  });

  it('401 na recarga dispara authInterceptor, limpa sessão, leva ao login com aviso e mantém saldo inalterado (CA6)', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const controller = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);
    const idle = TestBed.inject(IdleSessionService);
    const apiUrl = TestBed.inject(API_URL);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    auth.startSession('expired-token', { name: 'Gerente', role: 'MANAGER' });

    const fixture = TestBed.createComponent(CustomersPage);
    fixture.detectChanges();

    const listReq = controller.expectOne(`${apiUrl}/customers`);
    listReq.flush({ data: [mariaCustomer] });
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>(`[data-testid="add-credit-${mariaCustomer.id}"]`)!.click();
    await fixture.whenStable();

    const amountInput = el.querySelector<HTMLInputElement>('[data-testid="input-credit-amount"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="credit-modal"] form')!;

    amountInput.value = '50,00';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));

    const creditReq = controller.expectOne(`${apiUrl}/customers/${mariaCustomer.id}/credits`);
    expect(creditReq.request.method).toBe('POST');
    expect(creditReq.request.body).toEqual({ amountCents: 5000 });
    creditReq.flush(
      { statusCode: 401, message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();

    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(el.textContent).not.toContain('Não foi possível conectar. Tente novamente.');
    expect(el.querySelector('[data-testid="stat-total-credit"]')?.textContent?.trim()).toBe(
      'R$\u00a0150,00',
    );
    expect(el.querySelector<HTMLButtonElement>('[data-testid="submit-credit"]')?.disabled).toBe(
      false,
    );

    controller.verify();
    sessionStorage.clear();
  });
});
