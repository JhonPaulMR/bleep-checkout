import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { AuthService } from '../../../core/auth/auth.service';
import { IdleSessionService } from '../../../core/auth/idle-session.service';
import { API_URL } from '../../../core/config/api-url';
import { CreateProductPayload, Product, ProductsService } from '../data/products.service';
import { ProductsPage } from './products.page';

describe('ProductsPage', () => {
  let listSpy: ReturnType<typeof vi.fn>;
  let createSpy: ReturnType<typeof vi.fn>;

  const cafeProduct: Product = {
    id: 'prod-1',
    name: 'Café Torrado 500g',
    barcode: '7891000100103',
    priceCents: 2490,
    active: true,
    createdAt: '2026-11-21T10:00:00.000Z',
  };

  const leiteProduct: Product = {
    id: 'prod-2',
    name: 'Leite Integral 1L',
    barcode: '7892000200206',
    priceCents: 599,
    active: true,
    createdAt: '2026-11-21T11:00:00.000Z',
  };

  const inactiveProduct: Product = {
    id: 'prod-3',
    name: 'Achocolatado 400g',
    barcode: '7893000300309',
    priceCents: 1250,
    active: false,
    createdAt: '2026-11-21T12:00:00.000Z',
  };

  function setup(
    initialProducts: Product[] | Observable<Product[]> = [],
    createImpl: (payload: CreateProductPayload) => Observable<Product> = (payload) =>
      of({
        id: 'prod-new',
        name: payload.name,
        barcode: payload.barcode,
        priceCents: payload.priceCents,
        active: true,
        createdAt: '2026-11-25T12:00:00.000Z',
      }),
  ) {
    listSpy = vi.fn().mockReturnValue(
      Array.isArray(initialProducts) ? of(initialProducts) : initialProducts,
    );
    createSpy = vi.fn().mockImplementation(createImpl);

    TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [
        {
          provide: ProductsService,
          useValue: { list: listSpy, create: createSpy },
        },
      ],
    });

    return TestBed.createComponent(ProductsPage);
  }

  it('exibe estado de carregamento enquanto a lista não chega e renderiza a tabela quando carrega', async () => {
    const list$ = new Subject<Product[]>();
    const fixture = setup(list$);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Carregando produtos...');
    expect(el.textContent).not.toContain('Nenhum produto cadastrado ainda.');

    list$.next([cafeProduct, inactiveProduct]);
    list$.complete();
    await fixture.whenStable();

    expect(el.textContent).not.toContain('Carregando produtos...');
    expect(el.textContent).toContain('Café Torrado 500g');
    expect(el.textContent).toContain('7891000100103');
    expect(el.textContent).toContain('R$\u00a024,90');
    expect(el.textContent).toContain('Disponível');
    expect(el.textContent).toContain('Achocolatado 400g');
    expect(el.textContent).toContain('Desativado');
  });

  it('exibe os cards de resumo com a contagem real de produtos ativos e 0 duplicados', async () => {
    const fixture = setup([cafeProduct, leiteProduct, inactiveProduct]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const activeCard = el.querySelector('[data-testid="active-products-count"]');
    const duplicatesCard = el.querySelector('[data-testid="duplicate-barcodes-count"]');

    expect(activeCard?.textContent?.trim()).toBe('2');
    expect(duplicatesCard?.textContent?.trim()).toBe('0');
  });

  it('filtra produtos localmente por nome (case-insensitive) e por código de barras com trim', async () => {
    const fixture = setup([cafeProduct, leiteProduct]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const searchInput = el.querySelector<HTMLInputElement>(
      'input[placeholder="Buscar por código ou nome..."]',
    )!;
    expect(searchInput).not.toBeNull();

    searchInput.value = '  café  ';
    searchInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('Café Torrado 500g');
    expect(el.textContent).not.toContain('Leite Integral 1L');

    searchInput.value = ' 7892000 ';
    searchInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('Leite Integral 1L');
    expect(el.textContent).not.toContain('Café Torrado 500g');
  });

  it('exibe estado vazio quando não há produtos cadastrados e mantém botão + Novo Produto disponível', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('Nenhum produto cadastrado ainda.');

    const newProductButton = el.querySelector<HTMLButtonElement>(
      '[data-testid="open-new-product-modal"]',
    );
    expect(newProductButton).not.toBeNull();
    expect(newProductButton?.disabled).toBe(false);
    expect(newProductButton?.textContent).toContain('Novo Produto');
  });

  it('exibe estado vazio de busca quando nenhum produto corresponde ao termo e mantém botão + Novo Produto disponível', async () => {
    const fixture = setup([cafeProduct]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const searchInput = el.querySelector<HTMLInputElement>(
      'input[placeholder="Buscar por código ou nome..."]',
    )!;
    searchInput.value = 'inexistente';
    searchInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('Nenhum produto encontrado para a busca.');
    expect(el.textContent).not.toContain('Nenhum produto cadastrado ainda.');

    const newProductButton = el.querySelector<HTMLButtonElement>(
      '[data-testid="open-new-product-modal"]',
    );
    expect(newProductButton).not.toBeNull();
    expect(newProductButton?.disabled).toBe(false);
  });

  it('mantém botões Editar e Desativar desabilitados na tabela', async () => {
    const fixture = setup([cafeProduct]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('tbody button'));
    const editButton = buttons.find((btn) => btn.textContent?.includes('Editar'));
    const deactivateButton = buttons.find((btn) => btn.textContent?.includes('Desativar'));

    expect(editButton).toBeDefined();
    expect(editButton?.disabled).toBe(true);
    expect(deactivateButton).toBeDefined();
    expect(deactivateButton?.disabled).toBe(true);
  });

  it('exibe mensagem de erro e não exibe estado vazio quando a listagem falha', async () => {
    const fixture = setup(throwError(() => new Error('Network error')));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const alertEl = el.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).not.toContain('Nenhum produto cadastrado ainda.');
  });

  it('abre o modal pelo botão + Novo Produto e fecha por Cancelar ou X sem chamar ProductsService.create', async () => {
    const fixture = setup([cafeProduct]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="product-modal"]')).toBeNull();

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-product-modal"]')!.click();
    await fixture.whenStable();

    const modal = el.querySelector('[data-testid="product-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Cadastrar Novo Produto');
    expect(modal?.textContent).toContain(
      'Preencha os dados essenciais para habilitar o item no caixa',
    );
    expect(modal?.textContent).toContain(
      'O produto só aparece no caixa depois que o cadastro é concluído com todos os campos válidos.',
    );

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-name"]')!;
    nameInput.value = 'Produto Abandonado';
    nameInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('[data-testid="cancel-product-modal"]')!.click();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="product-modal"]')).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();

    // Reabre e verifica que o campo foi resetado; fecha pelo botão X
    el.querySelector<HTMLButtonElement>('[data-testid="open-new-product-modal"]')!.click();
    await fixture.whenStable();
    expect(el.querySelector<HTMLInputElement>('[data-testid="input-product-name"]')!.value).toBe('');

    el.querySelector<HTMLButtonElement>('[data-testid="close-product-modal"]')!.click();
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="product-modal"]')).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('bloqueia envio e exibe erros por campo para nome vazio, EAN-13 inválido e preço vazio/zero/negativo', async () => {
    const fixture = setup([]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-product-modal"]')!.click();
    await fixture.whenStable();

    const form = el.querySelector<HTMLFormElement>('[data-testid="product-modal"] form')!;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe o nome do produto.');
    expect(el.textContent).toContain('Informe o código de barras.');
    expect(el.textContent).toContain('Informe o preço unitário.');

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-name"]')!;
    const barcodeInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-product-barcode"]',
    )!;
    const priceInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-price"]')!;

    nameInput.value = '   ';
    nameInput.dispatchEvent(new Event('input'));
    barcodeInput.value = '789123';
    barcodeInput.dispatchEvent(new Event('input'));
    priceInput.value = '0,00';
    priceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe o nome do produto.');
    expect(el.textContent).toContain(
      'O código de barras deve conter exatamente 13 dígitos numéricos.',
    );
    expect(el.textContent).toContain('Informe um preço unitário maior que zero.');

    priceInput.value = '-5,00';
    priceInput.dispatchEvent(new Event('input'));
    barcodeInput.value = '7891000100103';
    barcodeInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('EAN válido');

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Informe um preço unitário maior que zero.');
  });

  it('envia produto válido com priceCents convertido, mostra Salvando..., atualiza tabela ordenada e fecha o modal', async () => {
    const create$ = new Subject<Product>();
    const fixture = setup([leiteProduct], () => create$);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-product-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-name"]')!;
    const barcodeInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-product-barcode"]',
    )!;
    const priceInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-price"]')!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-product"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="product-modal"] form')!;

    nameInput.value = '  Arroz Tipo 1 5kg  ';
    nameInput.dispatchEvent(new Event('input'));
    barcodeInput.value = '7894000400402';
    barcodeInput.dispatchEvent(new Event('input'));
    priceInput.value = '24,90';
    priceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({
      name: 'Arroz Tipo 1 5kg',
      barcode: '7894000400402',
      priceCents: 2490,
    });
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain('Salvando...');

    // Cliques repetidos durante salvamento não disparam nova chamada
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(createSpy).toHaveBeenCalledTimes(1);

    const createdProduct: Product = {
      id: 'prod-4',
      name: 'Arroz Tipo 1 5kg',
      barcode: '7894000400402',
      priceCents: 2490,
      active: true,
      createdAt: '2026-11-25T13:00:00.000Z',
    };
    create$.next(createdProduct);
    create$.complete();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="product-modal"]')).toBeNull();
    expect(el.querySelector('[data-testid="active-products-count"]')?.textContent?.trim()).toBe('2');

    const rows = Array.from(el.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Arroz Tipo 1 5kg');
    expect(rows[1].textContent).toContain('Leite Integral 1L');
  });

  it('409 no cadastro exibe mensagem de código duplicado com ícone de erro, borda de perigo, oculta badge EAN válido e mantém campos preenchidos', async () => {
    const fixture = setup([cafeProduct]);
    createSpy.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { message: 'Já existe um produto com este código de barras.' },
          }),
      ),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-product-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-name"]')!;
    const barcodeInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-product-barcode"]',
    )!;
    const priceInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-price"]')!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-product"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="product-modal"] form')!;

    nameInput.value = 'Café Repetido';
    nameInput.dispatchEvent(new Event('input'));
    barcodeInput.value = '7891000100103';
    barcodeInput.dispatchEvent(new Event('input'));
    priceInput.value = '19.90';
    priceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('EAN válido');

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toContain('Salvar Produto');
    expect(el.querySelector('[data-testid="product-modal"]')).not.toBeNull();

    // Mensagem de conflito 409 com ícone de erro e alert
    expect(el.textContent).toContain('Já existe um produto com este código de barras.');
    const alert = el.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Já existe um produto com este código de barras.');
    expect(alert?.textContent).toContain('error');

    // Badge EAN válido não deve ser exibido durante o conflito
    expect(el.textContent).not.toContain('EAN válido');

    // Borda de erro no input de código de barras
    expect(barcodeInput.classList.contains('border-perigo')).toBe(true);
    expect(barcodeInput.classList.contains('border-2')).toBe(true);

    // Campos mantidos preenchidos para correção
    expect(nameInput.value).toBe('Café Repetido');
    expect(barcodeInput.value).toBe('7891000100103');
    expect(priceInput.value).toBe('19.90');

    // Alterar o campo barcode limpa o erro de conflito e restabelece a validação
    barcodeInput.value = '7891000100104';
    barcodeInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).not.toContain('Já existe um produto com este código de barras.');
    expect(el.textContent).toContain('EAN válido');
    expect(barcodeInput.classList.contains('border-perigo')).toBe(false);
  });

  it('falha de rede no cadastro exibe mensagem de conexão, mantém campos preenchidos e retira botão do carregamento', async () => {
    const fixture = setup([], () =>
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-new-product-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-name"]')!;
    const barcodeInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-product-barcode"]',
    )!;
    const priceInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-price"]')!;
    const submitButton = el.querySelector<HTMLButtonElement>('[data-testid="submit-product"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="product-modal"] form')!;

    nameInput.value = 'Feijão Carioca 1kg';
    nameInput.dispatchEvent(new Event('input'));
    barcodeInput.value = '7895000500505';
    barcodeInput.dispatchEvent(new Event('input'));
    priceInput.value = '9.50';
    priceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="product-modal"]')).not.toBeNull();
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toContain('Salvar Produto');
    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível conectar. Tente novamente.',
    );
    expect(nameInput.value).toBe('Feijão Carioca 1kg');
    expect(barcodeInput.value).toBe('7895000500505');
    expect(priceInput.value).toBe('9.50');
  });

  it('401 no envio do cadastro dispara authInterceptor, limpa sessão, leva ao login com aviso e não adiciona produto', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProductsPage],
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

    const fixture = TestBed.createComponent(ProductsPage);
    fixture.detectChanges();

    const listReq = controller.expectOne(`${apiUrl}/products`);
    expect(listReq.request.method).toBe('GET');
    listReq.flush({ data: [cafeProduct] });
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('[data-testid="open-new-product-modal"]')!.click();
    await fixture.whenStable();

    const nameInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-name"]')!;
    const barcodeInput = el.querySelector<HTMLInputElement>(
      '[data-testid="input-product-barcode"]',
    )!;
    const priceInput = el.querySelector<HTMLInputElement>('[data-testid="input-product-price"]')!;
    const form = el.querySelector<HTMLFormElement>('[data-testid="product-modal"] form')!;

    nameInput.value = 'Novo Café';
    nameInput.dispatchEvent(new Event('input'));
    barcodeInput.value = '7899999999999';
    barcodeInput.dispatchEvent(new Event('input'));
    priceInput.value = '15.00';
    priceInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));

    const createReq = controller.expectOne(`${apiUrl}/products`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush(
      { statusCode: 401, message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();

    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(el.textContent).not.toContain('Novo Café');
    expect(el.textContent).not.toContain('Não foi possível conectar. Tente novamente.');
    expect(el.querySelector<HTMLButtonElement>('[data-testid="submit-product"]')?.disabled).toBe(
      false,
    );

    controller.verify();
    sessionStorage.clear();
  });
});
