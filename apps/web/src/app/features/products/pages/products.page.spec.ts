import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Product, ProductsService } from '../data/products.service';
import { ProductsPage } from './products.page';

describe('ProductsPage', () => {
  let listSpy: ReturnType<typeof vi.fn>;

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

  function setup(initialProducts: Product[] | Observable<Product[]> = []) {
    listSpy = vi.fn().mockReturnValue(
      Array.isArray(initialProducts) ? of(initialProducts) : initialProducts,
    );

    TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [
        {
          provide: ProductsService,
          useValue: { list: listSpy },
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
});
