import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Customer, CustomersService } from '../data/customers.service';
import { CustomersPage } from './customers.page';

describe('CustomersPage', () => {
  let listSpy: ReturnType<typeof vi.fn>;

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

  function setup(initialCustomers: Customer[] | Observable<Customer[]> = []) {
    listSpy = vi.fn().mockReturnValue(
      Array.isArray(initialCustomers) ? of(initialCustomers) : initialCustomers,
    );

    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        {
          provide: CustomersService,
          useValue: { list: listSpy },
        },
      ],
    });

    return TestBed.createComponent(CustomersPage);
  }

  it('exibe estado de carregamento enquanto a lista não chega e renderiza a tabela com CPF formatado, saldo em BRL e botão + Adicionar crédito desabilitado', async () => {
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
    expect(addCreditButtons[0].disabled).toBe(true);
    expect(addCreditButtons[1].disabled).toBe(true);
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
});
