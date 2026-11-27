import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { AuthService } from '../../../core/auth/auth.service';
import { IdleSessionService } from '../../../core/auth/idle-session.service';
import { API_URL } from '../../../core/config/api-url';
import {
  CheckoutCustomer,
  CheckoutService,
  CustomerCreditPaymentResult,
  PaymentResponse,
  Product,
  Sale,
} from '../data/checkout.service';
import { CheckoutPage } from './checkout.page';

interface MockBrickCallbacks {
  onReady?: () => void;
  onSubmit: (formData: Record<string, unknown>) => Promise<void>;
  onError?: (error: unknown) => void;
}

interface MockBrickConfig {
  initialization: {
    amount: number;
    payer: { email: string };
  };
  callbacks: MockBrickCallbacks;
}

describe('CheckoutPage', () => {
  let findProductByBarcodeSpy: ReturnType<typeof vi.fn>;
  let searchProductsSpy: ReturnType<typeof vi.fn>;
  let listCustomersSpy: ReturnType<typeof vi.fn>;
  let createSaleSpy: ReturnType<typeof vi.fn>;
  let pollSaleUntilSettledSpy: ReturnType<typeof vi.fn>;
  let getPaymentConfigSpy: ReturnType<typeof vi.fn>;
  let payWithCardSpy: ReturnType<typeof vi.fn>;
  let payWithPixSpy: ReturnType<typeof vi.fn>;
  let payWithCustomerCreditSpy: ReturnType<typeof vi.fn>;
  let payExternalSpy: ReturnType<typeof vi.fn>;
  let cancelSaleSpy: ReturnType<typeof vi.fn>;

  let brickCreateSpy: ReturnType<typeof vi.fn>;
  let brickUnmountSpy: ReturnType<typeof vi.fn<() => void>>;
  let capturedBrickConfig: MockBrickConfig | null;
  let mercadoPagoConstructorSpy: ReturnType<typeof vi.fn>;

  const sampleProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Café Espresso',
      barcode: '7890000000001',
      priceCents: 1250,
      active: true,
      createdAt: '2026-11-24T10:00:00.000Z',
    },
    {
      id: 'prod-2',
      name: 'Pão de Queijo',
      barcode: '7890000000002',
      priceCents: 800,
      active: true,
      createdAt: '2026-11-24T10:00:00.000Z',
    },
  ];

  const sampleCustomers: CheckoutCustomer[] = [
    {
      id: 'cust-1',
      name: 'Ana Clara',
      cpf: '12345678901',
      balanceCents: 15000,
    },
    {
      id: 'cust-2',
      name: 'Bruno Silva',
      cpf: '98765432100',
      balanceCents: 4500,
    },
  ];

  const openSale: Sale = {
    id: 'sale-1',
    number: 42,
    operatorId: 'op-1',
    status: 'OPEN',
    totalCents: 2500,
    createdAt: '2026-11-24T10:05:00.000Z',
    completedAt: null,
    items: [
      {
        id: 'item-1',
        saleId: 'sale-1',
        productId: 'prod-1',
        quantity: 2,
        unitPriceCents: 1250,
        product: sampleProducts[0],
      },
    ],
    payments: [],
  };

  function setup(options?: { operatorName?: string }) {
    capturedBrickConfig = null;
    brickUnmountSpy = vi.fn<() => void>();
    brickCreateSpy = vi.fn().mockImplementation(
      async (_brickType: string, _containerId: string, config: MockBrickConfig) => {
        capturedBrickConfig = config;
        config.callbacks.onReady?.();
        return { unmount: brickUnmountSpy };
      },
    );
    mercadoPagoConstructorSpy = vi.fn().mockImplementation(function () {
      return {
        bricks: () => ({
          create: brickCreateSpy,
        }),
      };
    });

    (window as unknown as { MercadoPago?: unknown }).MercadoPago = mercadoPagoConstructorSpy;

    findProductByBarcodeSpy = vi.fn().mockImplementation((barcode: string) => {
      const found = sampleProducts.find((p) => p.barcode === barcode.trim());
      if (found) {
        return of(found);
      }
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { message: 'Produto não localizado.' },
          }),
      );
    });
    searchProductsSpy = vi.fn().mockImplementation((term: string) => {
      const normalized = term.trim().toLowerCase();
      if (!normalized) {
        return of(sampleProducts);
      }
      return of(sampleProducts.filter((p) => p.name.toLowerCase().includes(normalized)));
    });
    listCustomersSpy = vi.fn().mockReturnValue(of(sampleCustomers));
    createSaleSpy = vi.fn().mockReturnValue(of(openSale));
    pollSaleUntilSettledSpy = vi.fn().mockReturnValue(new Subject<Sale>().asObservable());
    getPaymentConfigSpy = vi.fn().mockReturnValue(of({ publicKey: 'TEST-public-key-123' }));
    payWithCardSpy = vi.fn();
    payWithPixSpy = vi.fn();
    payWithCustomerCreditSpy = vi.fn();
    payExternalSpy = vi.fn();
    cancelSaleSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        {
          provide: CheckoutService,
          useValue: {
            findProductByBarcode: findProductByBarcodeSpy,
            searchProducts: searchProductsSpy,
            listCustomers: listCustomersSpy,
            createSale: createSaleSpy,
            pollSaleUntilSettled: pollSaleUntilSettledSpy,
            getPaymentConfig: getPaymentConfigSpy,
            payWithCard: payWithCardSpy,
            payWithPix: payWithPixSpy,
            payWithCustomerCredit: payWithCustomerCreditSpy,
            payExternal: payExternalSpy,
            cancelSale: cancelSaleSpy,
          },
        },
      ],
    });

    if (options?.operatorName) {
      TestBed.inject(AuthService).startSession('token', {
        name: options.operatorName,
        role: 'OPERATOR',
      });
    } else {
      TestBed.inject(AuthService).clearSession();
    }

    return TestBed.createComponent(CheckoutPage);
  }

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { MercadoPago?: unknown }).MercadoPago;
  });

  async function flushMicrotasks(turns = 4): Promise<void> {
    for (let i = 0; i < turns; i += 1) {
      await Promise.resolve();
    }
  }

  function setBarcodeInput(el: HTMLElement, code: string): HTMLInputElement {
    const input = el.querySelector<HTMLInputElement>('[data-testid="barcode-input"]')!;
    input.value = code;
    input.dispatchEvent(new Event('input'));
    return input;
  }

  function addByBarcodeClick(fixture: ReturnType<typeof setup>, code: string): HTMLElement {
    const el = fixture.nativeElement as HTMLElement;
    setBarcodeInput(el, code);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="add-by-barcode"]')!.click();
    fixture.detectChanges();
    return el;
  }

  async function addFirstProductAndProceed(fixture: ReturnType<typeof setup>) {
    fixture.detectChanges();
    const el = addByBarcodeClick(fixture, '7890000000001');

    const proceedButton = el.querySelector<HTMLButtonElement>('[data-testid="proceed-payment"]')!;
    proceedButton.click();
    fixture.detectChanges();
    await flushMicrotasks();
    fixture.detectChanges();
    return el;
  }

  it('cria a venda enviando apenas productId e quantity e inicializa o Card Payment Brick com publicKey da API, amount de exibição e payer.email padrão', async () => {
    const fixture = setup();
    const el = await addFirstProductAndProceed(fixture);

    expect(createSaleSpy).toHaveBeenCalledWith([{ productId: 'prod-1', quantity: 1 }]);
    expect(getPaymentConfigSpy).toHaveBeenCalledTimes(1);
    expect(mercadoPagoConstructorSpy).toHaveBeenCalledWith('TEST-public-key-123', {
      locale: 'pt-BR',
    });
    expect(brickCreateSpy).toHaveBeenCalledWith(
      'cardPayment',
      'card-payment-brick-container',
      expect.objectContaining({
        initialization: {
          amount: 25,
          payer: { email: 'operador@bleep.local' },
        },
      }),
    );
    expect(el.textContent).toContain('Venda #42');
    expect(el.textContent).toContain('25,00');
    const statusBadge = el.querySelector('[data-testid="sale-status-badge"]');
    expect(statusBadge?.querySelector('svg')).not.toBeNull();
  });

  it('no onSubmit do Brick envia cobrança sem transaction_amount e exibe venda concluída quando COMPLETED (CA3)', async () => {
    const fixture = setup();
    const completedResponse: PaymentResponse = {
      payment: {
        id: 'pay-1',
        saleId: 'sale-1',
        method: 'CARD',
        status: 'APPROVED',
        amountCents: 2500,
        gatewayPaymentId: 'mp-approved-1',
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-24T10:06:00.000Z',
      },
      sale: {
        ...openSale,
        status: 'COMPLETED',
        completedAt: '2026-11-24T10:06:01.000Z',
      },
    };
    payWithCardSpy.mockReturnValue(of(completedResponse));

    const el = await addFirstProductAndProceed(fixture);
    expect(capturedBrickConfig).not.toBeNull();

    await capturedBrickConfig!.callbacks.onSubmit({
      token: 'tok_approved',
      payment_method_id: 'master',
      installments: 1,
      transaction_amount: 0.01,
      payer: {
        email: 'comprador@sandbox.test',
        identification: { type: 'CPF', number: '19119119100' },
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(payWithCardSpy).toHaveBeenCalledWith('sale-1', {
      token: 'tok_approved',
      paymentMethodId: 'master',
      installments: 1,
      identification: { type: 'CPF', number: '19119119100' },
      payerEmail: 'comprador@sandbox.test',
    });
    const sentPayload = payWithCardSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(sentPayload).not.toHaveProperty('transaction_amount');

    expect(el.textContent).toContain('Venda concluída');
    expect(el.querySelector('[data-testid="new-sale"]')).not.toBeNull();
  });

  it('exibe aviso de recusa quando pagamento com cartão é DECLINED e permite nova tentativa na mesma venda (CA4)', async () => {
    const fixture = setup();
    const declinedResponse: PaymentResponse = {
      payment: {
        id: 'pay-2',
        saleId: 'sale-1',
        method: 'CARD',
        status: 'DECLINED',
        amountCents: 2500,
        gatewayPaymentId: 'mp-declined-1',
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-24T10:06:00.000Z',
      },
      sale: openSale,
    };
    payWithCardSpy.mockReturnValue(of(declinedResponse));

    const el = await addFirstProductAndProceed(fixture);

    await capturedBrickConfig!.callbacks.onSubmit({
      token: 'tok_declined',
      payment_method_id: 'master',
      installments: 1,
      payer: {
        identification: { type: 'CPF', number: '19119119100' },
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.textContent).toContain('Pagamento recusado');
    expect(el.textContent).not.toContain('Venda concluída');

    const retryButton = el.querySelector<HTMLButtonElement>('[data-testid="retry-card"]')!;
    expect(retryButton).not.toBeNull();
    retryButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(brickUnmountSpy).toHaveBeenCalled();
    expect(brickCreateSpy).toHaveBeenCalledTimes(2);
  });

  it('quando pagamento fica PENDING exibe "Estamos confirmando o pagamento" e acompanha via pollSaleUntilSettled até concluir (CA5)', async () => {
    const fixture = setup();
    const pendingSale: Sale = { ...openSale, status: 'PENDING' };
    const completedSale: Sale = {
      ...openSale,
      status: 'COMPLETED',
      completedAt: '2026-11-24T10:07:00.000Z',
    };
    const poll$ = new Subject<Sale>();

    payWithCardSpy.mockReturnValue(
      of({
        payment: {
          id: 'pay-3',
          saleId: 'sale-1',
          method: 'CARD',
          status: 'PENDING',
          amountCents: 2500,
          gatewayPaymentId: 'mp-pending-1',
          qrCode: null,
          qrCodeBase64: null,
          createdAt: '2026-11-24T10:06:00.000Z',
        },
        sale: pendingSale,
      } satisfies PaymentResponse),
    );
    pollSaleUntilSettledSpy.mockReturnValue(poll$.asObservable());

    const el = await addFirstProductAndProceed(fixture);

    await capturedBrickConfig!.callbacks.onSubmit({
      token: 'tok_pending',
      payment_method_id: 'master',
      installments: 1,
      payer: {
        identification: { type: 'CPF', number: '19119119100' },
      },
    });
    fixture.detectChanges();

    expect(pollSaleUntilSettledSpy).toHaveBeenCalledWith('sale-1');
    expect(el.textContent).toContain('Estamos confirmando o pagamento');
    expect(el.textContent).not.toContain('Venda concluída');

    poll$.next(pendingSale);
    fixture.detectChanges();
    expect(el.textContent).toContain('Estamos confirmando o pagamento');

    poll$.next(completedSale);
    poll$.complete();
    fixture.detectChanges();
    expect(el.textContent).toContain('Venda concluída');
  });

  it('ao escolher PIX gera QR Code (imagem base64 e copia-e-cola), mantém estado pendente e encerra assinatura de polling ao destruir (CA6)', async () => {
    const fixture = setup();
    const pendingSale: Sale = { ...openSale, status: 'PENDING' };
    let unsubscribed = false;
    const poll$ = new Observable<Sale>(() => {
      return () => {
        unsubscribed = true;
      };
    });

    payWithPixSpy.mockReturnValue(
      of({
        payment: {
          id: 'pay-pix-1',
          saleId: 'sale-1',
          method: 'PIX',
          status: 'PENDING',
          amountCents: 2500,
          gatewayPaymentId: 'mp-pix-1',
          qrCode: '00020126580014br.gov.bcb.pix-copia-cola',
          qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
          createdAt: '2026-11-24T10:06:00.000Z',
        },
        sale: pendingSale,
      } satisfies PaymentResponse),
    );
    pollSaleUntilSettledSpy.mockReturnValue(poll$);

    const el = await addFirstProductAndProceed(fixture);

    const pixTab = el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!;
    pixTab.click();
    fixture.detectChanges();

    const generatePixButton = el.querySelector<HTMLButtonElement>('[data-testid="generate-pix"]')!;
    generatePixButton.click();
    fixture.detectChanges();

    expect(payWithPixSpy).toHaveBeenCalledWith('sale-1');
    expect(pollSaleUntilSettledSpy).toHaveBeenCalledWith('sale-1');
    expect(el.textContent).toContain('Aguardando confirmação do PIX');
    expect(el.textContent).toContain('00020126580014br.gov.bcb.pix-copia-cola');

    const qrImg = el.querySelector<HTMLImageElement>('img[alt="QR Code PIX"]');
    expect(qrImg).not.toBeNull();
    expect(qrImg?.src).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
    expect(el.textContent).not.toContain('Venda concluída');

    // Encerra polling ao destruir componente
    expect(unsubscribed).toBe(false);
    fixture.destroy();
    expect(unsubscribed).toBe(true);
  });

  it('desmonta imediatamente o Card Payment Brick se o operador trocar para PIX durante a montagem assíncrona', async () => {
    const fixture = setup();
    let resolveBrickCreate!: (controller: { unmount: () => void }) => void;
    brickCreateSpy.mockImplementation(
      () =>
        new Promise<{ unmount: () => void }>((resolve) => {
          resolveBrickCreate = resolve;
        }),
    );

    const el = await addFirstProductAndProceed(fixture);
    expect(brickCreateSpy).toHaveBeenCalledTimes(1);

    // Operador troca para PIX antes de bricksBuilder.create() resolver
    const pixTab = el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!;
    pixTab.click();
    fixture.detectChanges();

    resolveBrickCreate({ unmount: brickUnmountSpy });
    await flushMicrotasks();

    expect(brickUnmountSpy).toHaveBeenCalledTimes(1);
  });

  it('desmonta imediatamente o Card Payment Brick se o componente for destruído durante a montagem assíncrona', async () => {
    const fixture = setup();
    let resolveBrickCreate!: (controller: { unmount: () => void }) => void;
    brickCreateSpy.mockImplementation(
      () =>
        new Promise<{ unmount: () => void }>((resolve) => {
          resolveBrickCreate = resolve;
        }),
    );

    await addFirstProductAndProceed(fixture);
    expect(brickCreateSpy).toHaveBeenCalledTimes(1);

    fixture.destroy();

    resolveBrickCreate({ unmount: brickUnmountSpy });
    await flushMicrotasks();

    expect(brickUnmountSpy).toHaveBeenCalledTimes(1);
  });

  it('não gera rejeição não tratada se navigator.clipboard.writeText falhar ao copiar código PIX', async () => {
    const fixture = setup();
    const pendingSale: Sale = { ...openSale, status: 'PENDING' };
    payWithPixSpy.mockReturnValue(
      of({
        payment: {
          id: 'pay-pix-2',
          saleId: 'sale-1',
          method: 'PIX',
          status: 'PENDING',
          amountCents: 2500,
          gatewayPaymentId: 'mp-pix-2',
          qrCode: '00020126-codigo-pix',
          qrCodeBase64: null,
          createdAt: '2026-11-24T10:06:00.000Z',
        },
        sale: pendingSale,
      } satisfies PaymentResponse),
    );

    const writeTextSpy = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    const el = await addFirstProductAndProceed(fixture);
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="generate-pix"]')!.click();
    fixture.detectChanges();

    const copyButton = el.querySelector<HTMLButtonElement>('[data-testid="copy-pix-code"]')!;
    copyButton.click();
    await flushMicrotasks();
    fixture.detectChanges();

    expect(writeTextSpy).toHaveBeenCalledWith('00020126-codigo-pix');
    expect(copyButton.textContent).toContain('Copiar código PIX');
  });

  it('desabilita botão durante criação de venda e envio de PIX e exibe erro de rede sem marcar como pago (CA7)', async () => {
    const fixture = setup();
    const createSale$ = new Subject<Sale>();
    createSaleSpy.mockReturnValue(createSale$.asObservable());

    await fixture.whenStable();
    const el = addByBarcodeClick(fixture, '7890000000001');

    const proceedButton = el.querySelector<HTMLButtonElement>('[data-testid="proceed-payment"]')!;
    proceedButton.click();
    fixture.detectChanges();

    expect(proceedButton.disabled).toBe(true);
    // Segundo clique não deve disparar outra chamada
    proceedButton.click();
    expect(createSaleSpy).toHaveBeenCalledTimes(1);

    createSale$.next(openSale);
    createSale$.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Agora testa envio de PIX com erro de rede
    const pix$ = new Subject<PaymentResponse>();
    payWithPixSpy.mockReturnValue(pix$.asObservable());

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixture.detectChanges();

    const generatePixButton = el.querySelector<HTMLButtonElement>('[data-testid="generate-pix"]')!;
    generatePixButton.click();
    fixture.detectChanges();

    expect(generatePixButton.disabled).toBe(true);
    generatePixButton.click();
    expect(payWithPixSpy).toHaveBeenCalledTimes(1);

    pix$.error(new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));
    fixture.detectChanges();

    expect(generatePixButton.disabled).toBe(false);
    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).not.toContain('Venda concluída');
  });

  it('erro de rede na criação de venda exibe mensagem de conexão e reabilita botão', async () => {
    const fixture = setup();
    createSaleSpy.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );

    await fixture.whenStable();
    const el = addByBarcodeClick(fixture, '7890000000001');

    const proceedButton = el.querySelector<HTMLButtonElement>('[data-testid="proceed-payment"]')!;
    proceedButton.click();
    fixture.detectChanges();

    expect(proceedButton.disabled).toBe(false);
    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).not.toContain('Venda concluída');
  });

  it('exibe cabeçalho do terminal PDV com nome do operador e atalho F4 foca o campo de código de barras (CA6)', () => {
    const fixture = setup({ operatorName: 'João Operador' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Terminal 01 · Operador: João Operador');
    expect(el.textContent).toContain('API conectada');
    expect(el.textContent).toContain('Leitor USB pronto');
    expect(el.querySelector('[data-testid="open-search-modal"]')).not.toBeNull();

    const input = el.querySelector<HTMLInputElement>('[data-testid="barcode-input"]')!;
    const focusSpy = vi.spyOn(input, 'focus');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4' }));
    fixture.detectChanges();

    expect(focusSpy).toHaveBeenCalled();
  });

  it('adiciona produto por código de barras ao clicar em Adicionar, limpa o campo e soma +1 ao bipar novamente (CA1)', async () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = addByBarcodeClick(fixture, '7890000000001');
    await fixture.whenStable();
    fixture.detectChanges();
    const input = el.querySelector<HTMLInputElement>('[data-testid="barcode-input"]')!;

    expect(findProductByBarcodeSpy).toHaveBeenCalledWith('7890000000001');
    expect(input.value).toBe('');
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('1 un');
    expect(el.textContent).toContain('12,50');

    addByBarcodeClick(fixture, '7890000000001');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('2 un');
    expect(el.textContent).toContain('25,00');
  });

  it('adiciona produto automaticamente via leitor USB (keydown.enter) mantendo foco no campo (CA2)', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const input = setBarcodeInput(el, '7890000000002');
    const focusSpy = vi.spyOn(input, 'focus');
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(findProductByBarcodeSpy).toHaveBeenCalledWith('7890000000002');
    expect(el.textContent).toContain('Pão de Queijo');
    expect(input.value).toBe('');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('exibe "Produto não localizado." em erro 404 sem alterar o carrinho (CA4)', () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = addByBarcodeClick(fixture, '7890000000001');
    addByBarcodeClick(fixture, '0000000000000');

    const alertEl = el.querySelector('[data-testid="barcode-error"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.getAttribute('role')).toBe('alert');
    expect(alertEl?.textContent).toContain('Produto não localizado.');
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('1 un');
  });

  it('remove item individual e limpa lista sem chamar createSale (CA9)', () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = addByBarcodeClick(fixture, '7890000000001');
    addByBarcodeClick(fixture, '7890000000002');

    el.querySelector<HTMLButtonElement>('[data-testid="remove-item-prod-1"]')!.click();
    fixture.detectChanges();

    expect(el.textContent).not.toContain('Café Espresso');
    expect(el.textContent).toContain('Pão de Queijo');

    el.querySelector<HTMLButtonElement>('[data-testid="clear-cart"]')!.click();
    fixture.detectChanges();

    expect(el.textContent).toContain(
      'Nenhum produto adicionado. Bipe um código de barras ou busque por nome para iniciar a venda.',
    );
    expect(createSaleSpy).not.toHaveBeenCalled();
  });

  it('abre modal de busca por nome e fecha via botão fechar e tecla Escape sem alterar o carrinho nem criar venda (CA9)', () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = addByBarcodeClick(fixture, '7890000000001');
    el.querySelector<HTMLButtonElement>('[data-testid="open-search-modal"]')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="search-product-modal"]')).not.toBeNull();
    expect(searchProductsSpy).toHaveBeenCalledWith('');

    el.querySelector<HTMLButtonElement>('[data-testid="close-search-modal"]')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="search-product-modal"]')).toBeNull();

    el.querySelector<HTMLButtonElement>('[data-testid="open-search-modal"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="search-product-modal"]')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="search-product-modal"]')).toBeNull();
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('1 un');
    expect(createSaleSpy).not.toHaveBeenCalled();
  });

  it('pesquisa produto por nome no modal, exibe resultados e adiciona item selecionado ao carrinho (CA3)', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-search-modal"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const searchInput = el.querySelector<HTMLInputElement>('[data-testid="search-product-input"]')!;
    searchInput.value = 'café';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('[data-testid="run-product-search"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(searchProductsSpy).toHaveBeenCalledWith('café');
    const modal = el.querySelector('[data-testid="search-product-modal"]')!;
    expect(modal.textContent).toContain('Café Espresso');
    expect(modal.textContent).toContain('EAN-13: 7890000000001');
    expect(modal.textContent).toContain('12,50');
    expect(modal.textContent).not.toContain('Pão de Queijo');

    el.querySelector<HTMLButtonElement>('[data-testid="select-search-product-prod-1"]')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="search-product-modal"]')).toBeNull();
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('1 un');
  });

  it('pesquisa por nome sem resultados exibe "Nenhum produto encontrado." e mantém carrinho inalterado (CA5)', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = addByBarcodeClick(fixture, '7890000000001');

    el.querySelector<HTMLButtonElement>('[data-testid="open-search-modal"]')!.click();
    fixture.detectChanges();

    const searchInput = el.querySelector<HTMLInputElement>('[data-testid="search-product-input"]')!;
    searchInput.value = 'inexistente';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('[data-testid="run-product-search"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const modal = el.querySelector('[data-testid="search-product-modal"]')!;
    expect(modal.textContent).toContain('Nenhum produto encontrado.');
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('1 un');
  });

  it('falha de rede na busca por código de barras e por nome exibe "Não foi possível conectar. Tente novamente." sem alterar carrinho (CA8)', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = addByBarcodeClick(fixture, '7890000000001');

    findProductByBarcodeSpy.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );
    addByBarcodeClick(fixture, '7890000000002');

    const barcodeAlert = el.querySelector('[data-testid="barcode-error"]');
    expect(barcodeAlert?.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('1 un');

    searchProductsSpy.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );
    el.querySelector<HTMLButtonElement>('[data-testid="open-search-modal"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const searchAlert = el.querySelector('[data-testid="search-error"]');
    expect(searchAlert?.getAttribute('role')).toBe('alert');
    expect(searchAlert?.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('1 un');
  });

  it('401 na busca por código de barras dispara authInterceptor, limpa sessão, leva ao /login com aviso e não altera carrinho (CA8)', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
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

    auth.startSession('expired-token', { name: 'Operador', role: 'OPERATOR' });

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    setBarcodeInput(el, '7890000000001');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="add-by-barcode"]')!.click();

    const req = controller.expectOne(`${apiUrl}/products/barcode/7890000000001`);
    expect(req.request.method).toBe('GET');
    req.flush(
      { statusCode: 401, message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(el.textContent).toContain(
      'Nenhum produto adicionado. Bipe um código de barras ou busque por nome para iniciar a venda.',
    );
    expect(el.querySelector('[data-testid="barcode-error"]')).toBeNull();

    controller.verify();
    sessionStorage.clear();
  });

  function setQuantityInput(el: HTMLElement, value: string): HTMLInputElement {
    const input = el.querySelector<HTMLInputElement>('[data-testid="quantity-input"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    return input;
  }

  it('US04 CA1: inclui 4 unidades por código de barras (botão Adicionar), recalcula total e reseta quantidade para 1', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const qtyInput = setQuantityInput(el, '4');
    fixture.detectChanges();

    addByBarcodeClick(fixture, '7890000000001');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(findProductByBarcodeSpy).toHaveBeenCalledWith('7890000000001');
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('4 un');
    expect(el.textContent).toContain('50,00');
    expect(qtyInput.value).toBe('1');
  });

  it('US04 CA1: inclui 4 unidades via leitor USB (Enter) usando botões +/- e reseta quantidade para 1', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const incBtn = el.querySelector<HTMLButtonElement>('[data-testid="qty-increase"]')!;
    incBtn.click();
    incBtn.click();
    incBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const qtyInput = el.querySelector<HTMLInputElement>('[data-testid="quantity-input"]')!;
    expect(qtyInput.value).toBe('4');

    const barcodeInput = setBarcodeInput(el, '7890000000002');
    fixture.detectChanges();
    barcodeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Pão de Queijo');
    expect(el.textContent).toContain('4 un');
    expect(el.textContent).toContain('32,00');
    expect(qtyInput.value).toBe('1');
  });

  it('US04 CA2: inclusão repetida de 4 + 4 do mesmo produto soma para 8 unidades na mesma linha sem duplicar', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    setQuantityInput(el, '4');
    fixture.detectChanges();
    addByBarcodeClick(fixture, '7890000000001');
    await fixture.whenStable();
    fixture.detectChanges();

    setQuantityInput(el, '4');
    fixture.detectChanges();
    addByBarcodeClick(fixture, '7890000000001');
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(el.textContent).toContain('8 un');
    expect(el.textContent).toContain('100,00');
  });

  it('US04 CA3: bloqueia 0, -2, 1.5 e vazio no código de barras sem chamar API nem alterar carrinho', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    for (const invalidValue of ['0', '-2', '1.5', '']) {
      setQuantityInput(el, invalidValue);
      fixture.detectChanges();

      addByBarcodeClick(fixture, '7890000000001');

      expect(findProductByBarcodeSpy).not.toHaveBeenCalled();
      const errorEl = el.querySelector('[data-testid="quantity-error"]');
      expect(errorEl).not.toBeNull();
      expect(errorEl?.getAttribute('role')).toBe('alert');
      expect(errorEl?.textContent).toContain('Informe uma quantidade inteira positiva.');
      expect(el.querySelectorAll('tbody tr').length).toBe(0);
    }
  });

  it('US04 CA3 e CA4: modal de busca sincroniza unidades, exibe prévia Total N un. / Adicionar N un., bloqueia inválidos e adiciona 4 unidades', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="open-search-modal"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const modal = el.querySelector('[data-testid="search-product-modal"]')!;
    const modalIncBtn = modal.querySelector<HTMLButtonElement>('[data-testid="modal-qty-increase"]')!;
    modalIncBtn.click();
    modalIncBtn.click();
    modalIncBtn.click();
    fixture.detectChanges();

    expect(modal.textContent).toContain('Total 4 un:');
    expect(modal.textContent).toContain('50,00');
    expect(modal.textContent).toContain('Adicionar 4 un.');

    // Testa bloqueio de quantidade inválida no modal
    setQuantityInput(el, '0');
    fixture.detectChanges();
    modal
      .querySelector<HTMLButtonElement>('[data-testid="select-search-product-prod-1"]')!
      .click();
    fixture.detectChanges();

    const modalAlert = modal.querySelector('[role="alert"]');
    expect(modalAlert?.textContent).toContain('Informe uma quantidade inteira positiva.');
    expect(el.querySelector('[data-testid="search-product-modal"]')).not.toBeNull();
    expect(el.querySelectorAll('tbody tr').length).toBe(0);

    // Ajusta de volta para 4 e adiciona
    setQuantityInput(el, '4');
    fixture.detectChanges();
    modal
      .querySelector<HTMLButtonElement>('[data-testid="select-search-product-prod-1"]')!
      .click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="search-product-modal"]')).toBeNull();
    expect(el.textContent).toContain('Café Espresso');
    expect(el.textContent).toContain('4 un');
    expect(el.textContent).toContain('50,00');
    expect(el.querySelector<HTMLInputElement>('[data-testid="quantity-input"]')!.value).toBe('1');
  });

  it('US04 CA5: atalho F2 foca o campo Nº de unidades durante a montagem da venda', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const qtyInput = el.querySelector<HTMLInputElement>('[data-testid="quantity-input"]')!;
    const focusSpy = vi.spyOn(qtyInput, 'focus');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    fixture.detectChanges();

    expect(focusSpy).toHaveBeenCalled();
  });

  it('US04 CA7: abandono com quantidade 4 (Esc no modal ou 404 no código de barras) mantém carrinho inalterado', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    setQuantityInput(el, '4');
    fixture.detectChanges();

    // Esc no modal
    el.querySelector<HTMLButtonElement>('[data-testid="open-search-modal"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="search-product-modal"]')).toBeNull();
    expect(el.querySelectorAll('tbody tr').length).toBe(0);

    // 404 no código de barras
    addByBarcodeClick(fixture, '0000000000000');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="barcode-error"]')?.textContent).toContain(
      'Produto não localizado.',
    );
    expect(el.querySelectorAll('tbody tr').length).toBe(0);
  });

  it('US05 CA5: card Cliente da Venda exibe estado vazio e abre modal pelo botão e pela tecla F3 carregando clientes', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const card = el.querySelector('[data-testid="customer-card"]')!;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Cliente da Venda');
    expect(card.textContent).toContain('[F3]');
    expect(card.textContent).toContain('Nenhum cliente identificado');

    const identifyBtn = el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!;
    expect(identifyBtn.disabled).toBe(false);
    identifyBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(listCustomersSpy).toHaveBeenCalledTimes(1);
    expect(el.querySelector('[data-testid="customer-modal"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="customer-modal"]')?.textContent).toContain('Ana Clara');
    expect(el.querySelector('[data-testid="customer-modal"]')?.textContent).toContain('Bruno Silva');

    // Fecha por Esc e reabre usando F3
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(listCustomersSpy).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="customer-modal"]')).not.toBeNull();
  });

  it('US05 CA5: filtra clientes no modal por nome e por CPF (com ou sem pontuação)', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const searchInput = el.querySelector<HTMLInputElement>('[data-testid="customer-search-input"]')!;

    // Filtro por nome (case-insensitive)
    searchInput.value = 'ana';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    let modalText = el.querySelector('[data-testid="customer-modal"]')?.textContent ?? '';
    expect(modalText).toContain('Ana Clara');
    expect(modalText).not.toContain('Bruno Silva');

    // Filtro por CPF com pontuação
    searchInput.value = '987.654';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    modalText = el.querySelector('[data-testid="customer-modal"]')?.textContent ?? '';
    expect(modalText).toContain('Bruno Silva');
    expect(modalText).not.toContain('Ana Clara');

    // Filtro por CPF sem pontuação
    searchInput.value = '12345678901';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    modalText = el.querySelector('[data-testid="customer-modal"]')?.textContent ?? '';
    expect(modalText).toContain('Ana Clara');
    expect(modalText).not.toContain('Bruno Silva');
  });

  it('US05 CA5: selecionar cliente fecha modal e exibe nome, CPF formatado e saldo em verde no card lateral', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();

    const card = el.querySelector('[data-testid="customer-card"]')!;
    expect(card.textContent).toContain('Ana Clara');
    expect(card.textContent).toContain('123.456.789-01');
    const balanceEl = card.querySelector('[data-testid="selected-customer-balance"]')!;
    expect(balanceEl.classList.contains('text-sucesso')).toBe(true);
    expect(balanceEl.textContent).toContain('150,00');
  });

  it('US05 CA5: envia customerId em createSale quando cliente selecionado e omite quando sem cliente', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Seleciona cliente e adiciona produto
    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    await addFirstProductAndProceed(fixture);

    expect(createSaleSpy).toHaveBeenCalledWith(
      [{ productId: 'prod-1', quantity: 1 }],
      'cust-1',
    );
  });

  it('US05: permite trocar e remover cliente selecionado e limpa ao iniciar nova venda', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Seleciona Ana Clara
    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="customer-card"]')?.textContent).toContain('Ana Clara');

    // Troca para Bruno Silva
    el.querySelector<HTMLButtonElement>('[data-testid="change-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-2"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="customer-card"]')?.textContent).toContain('Bruno Silva');
    expect(el.querySelector('[data-testid="customer-card"]')?.textContent).toContain('987.654.321-00');

    // Remove cliente
    el.querySelector<HTMLButtonElement>('[data-testid="remove-customer-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="customer-card"]')?.textContent).toContain(
      'Nenhum cliente identificado',
    );
  });

  it('US05 CA8: fechar modal por Esc, Cancelar ou backdrop mantém cliente selecionado e carrinho inalterados', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = addByBarcodeClick(fixture, '7890000000001');
    await fixture.whenStable();
    fixture.detectChanges();

    // Seleciona Ana Clara
    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    // Abre para trocar e fecha com Cancelar
    el.querySelector<HTMLButtonElement>('[data-testid="change-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="cancel-customer-modal"]')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();
    expect(el.querySelector('[data-testid="customer-card"]')?.textContent).toContain('Ana Clara');
    expect(el.querySelectorAll('tbody tr').length).toBe(1);

    // Abre para trocar e fecha clicando no backdrop
    el.querySelector<HTMLButtonElement>('[data-testid="change-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const backdrop = el.querySelector<HTMLElement>('[data-testid="customer-modal"]')!;
    backdrop.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="customer-modal"]')).toBeNull();
    expect(el.querySelector('[data-testid="customer-card"]')?.textContent).toContain('Ana Clara');
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('US05 CA7: erro de rede ao listar clientes exibe mensagem amigável, mantém carrinho/cliente e permite tentar novamente', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = addByBarcodeClick(fixture, '7890000000001');
    await fixture.whenStable();
    fixture.detectChanges();

    listCustomersSpy.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = el.querySelector('[data-testid="customer-modal-error"]');
    expect(errorEl?.getAttribute('role')).toBe('alert');
    expect(errorEl?.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.querySelectorAll('tbody tr').length).toBe(1);

    // Tentar novamente com sucesso
    el.querySelector<HTMLButtonElement>('[data-testid="retry-load-customers"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(listCustomersSpy).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="customer-modal-error"]')).toBeNull();
    expect(el.querySelector('[data-testid="customer-modal"]')?.textContent).toContain('Ana Clara');
  });

  it('US05 CA4: mantém botão Ir para pagamento desabilitado com carrinho vazio', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const proceedButton = el.querySelector<HTMLButtonElement>('[data-testid="proceed-payment"]')!;
    expect(proceedButton.disabled).toBe(true);
  });

  it('US05 CA3: selecionar Crédito do cliente sem cliente identificado exibe aviso e não permite debitar', async () => {
    const fixture = setup();
    const el = await addFirstProductAndProceed(fixture);

    const creditTab = el.querySelector<HTMLButtonElement>('[data-testid="select-method-customer-credit"]')!;
    creditTab.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Selecione um cliente para pagar com crédito.');
    const confirmBtn = el.querySelector<HTMLButtonElement>('[data-testid="confirm-customer-credit"]');
    expect(confirmBtn === null || confirmBtn.disabled).toBe(true);
    expect(payWithCustomerCreditSpy).not.toHaveBeenCalled();
  });

  it('US05 CA2: com saldo insuficiente exibe aviso de erro e mantém botão de débito desabilitado', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const lowBalanceCustomer: CheckoutCustomer = {
      id: 'cust-low',
      name: 'Carlos Souza',
      cpf: '11122233344',
      balanceCents: 1000,
    };
    listCustomersSpy.mockReturnValue(of([lowBalanceCustomer]));
    createSaleSpy.mockReturnValue(
      of({
        ...openSale,
        totalCents: 2500,
        customerId: lowBalanceCustomer.id,
        customer: lowBalanceCustomer,
      }),
    );

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-low"]')!.click();
    fixture.detectChanges();

    await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-customer-credit"]')!.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Carlos Souza');
    expect(el.textContent).toContain('111.222.333-44');
    expect(el.textContent).toContain('10,00');
    expect(el.textContent).toContain('25,00');
    const insufficientEl = el.querySelector('[data-testid="credit-insufficient-balance"]');
    expect(insufficientEl?.textContent).toContain('Saldo insuficiente — o saldo não será alterado');
    const confirmBtn = el.querySelector<HTMLButtonElement>('[data-testid="confirm-customer-credit"]')!;
    expect(confirmBtn.disabled).toBe(true);

    confirmBtn.click();
    fixture.detectChanges();
    expect(payWithCustomerCreditSpy).not.toHaveBeenCalled();
  });

  it('US05 CA1: com saldo suficiente exibe prévia de saldo restante, debita via API e conclui venda em COMPLETED', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const richCustomer = sampleCustomers[0]; // 15000 cents
    createSaleSpy.mockReturnValue(
      of({
        ...openSale,
        totalCents: 2500,
        customerId: richCustomer.id,
        customer: richCustomer,
      }),
    );

    const creditResult: CustomerCreditPaymentResult = {
      sale: {
        ...openSale,
        status: 'COMPLETED',
        completedAt: '2026-11-26T16:00:00.000Z',
        customerId: richCustomer.id,
        customer: { ...richCustomer, balanceCents: 12500 },
      },
      payment: {
        id: 'pay-credit-1',
        saleId: 'sale-1',
        method: 'CUSTOMER_CREDIT',
        status: 'APPROVED',
        amountCents: 2500,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-26T16:00:00.000Z',
      },
      customerBalanceCents: 12500,
    };
    payWithCustomerCreditSpy.mockReturnValue(of(creditResult));

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-customer-credit"]')!.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Ana Clara');
    expect(el.textContent).toContain('123.456.789-01');
    expect(el.textContent).toContain('150,00');
    expect(el.textContent).toContain('25,00');
    expect(el.textContent).toContain('125,00');

    const confirmBtn = el.querySelector<HTMLButtonElement>('[data-testid="confirm-customer-credit"]')!;
    expect(confirmBtn.disabled).toBe(false);
    expect(confirmBtn.textContent).toContain('Debitar');
    expect(confirmBtn.textContent).toContain('25,00');
    expect(confirmBtn.textContent).toContain('do crédito');

    confirmBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(payWithCustomerCreditSpy).toHaveBeenCalledTimes(1);
    expect(payWithCustomerCreditSpy).toHaveBeenCalledWith('sale-1');
    expect(el.textContent).toContain('Venda concluída');
    expect(el.textContent).toContain('Crédito do cliente');
    expect(el.querySelector('[data-testid="completed-customer-balance"]')?.textContent).toContain('125,00');
  });

  it('US05 CA8: alternar de Crédito do cliente para Cartão ou PIX sem confirmar não chama payWithCustomerCredit', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const richCustomer = sampleCustomers[0];
    createSaleSpy.mockReturnValue(
      of({
        ...openSale,
        totalCents: 2500,
        customerId: richCustomer.id,
        customer: richCustomer,
      }),
    );

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-customer-credit"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-card"]')!.click();
    fixture.detectChanges();
    await flushMicrotasks();

    expect(payWithCustomerCreditSpy).not.toHaveBeenCalled();
  });

  it('US05 CA7: erro de rede em payWithCustomerCredit mantém venda OPEN, reabilita botão e exibe mensagem amigável', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const richCustomer = sampleCustomers[0];
    createSaleSpy.mockReturnValue(
      of({
        ...openSale,
        totalCents: 2500,
        customerId: richCustomer.id,
        customer: richCustomer,
      }),
    );
    payWithCustomerCreditSpy.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-customer-credit"]')!.click();
    fixture.detectChanges();

    const confirmBtn = el.querySelector<HTMLButtonElement>('[data-testid="confirm-customer-credit"]')!;
    confirmBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain('Venda aberta');
    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(
      el.querySelector<HTMLButtonElement>('[data-testid="confirm-customer-credit"]')!.disabled,
    ).toBe(false);
  });

  it('US05 CA7: 401 em POST /sales/:id/payments/credit dispara authInterceptor, limpa sessão e redireciona para /login', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
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

    auth.startSession('expired-token', { name: 'Operador', role: 'OPERATOR' });

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Adiciona produto por código de barras
    setBarcodeInput(el, '7890000000001');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="add-by-barcode"]')!.click();
    controller.expectOne(`${apiUrl}/products/barcode/7890000000001`).flush({ data: sampleProducts[0] });
    fixture.detectChanges();

    // Seleciona cliente
    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    controller.expectOne(`${apiUrl}/customers`).flush({ data: sampleCustomers });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    // Cria venda
    el.querySelector<HTMLButtonElement>('[data-testid="proceed-payment"]')!.click();
    const saleWithCustomer: Sale = {
      ...openSale,
      totalCents: 1250,
      customerId: 'cust-1',
      customer: sampleCustomers[0],
    };
    controller.expectOne(`${apiUrl}/sales`).flush({ data: saleWithCustomer });
    fixture.detectChanges();

    // Troca para Crédito do cliente (cancela getPaymentConfig se houver, ou responde antes)
    const configReqs = controller.match(`${apiUrl}/payments/config`);
    configReqs.forEach((r) => r.flush({ data: { publicKey: 'TEST-pk' } }));
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-customer-credit"]')!.click();
    fixture.detectChanges();

    // Confirma débito e recebe 401
    el.querySelector<HTMLButtonElement>('[data-testid="confirm-customer-credit"]')!.click();
    const creditReq = controller.expectOne(`${apiUrl}/sales/sale-1/payments/credit`);
    expect(creditReq.request.method).toBe('POST');
    creditReq.flush(
      { statusCode: 401, message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(auth.isAuthenticated()).toBe(false);
    expect(idle.expired()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/login');

    controller.verify();
    sessionStorage.clear();
  });

  it('US07 CA3: selecionar Crédito externo ou Débito externo não aprova automaticamente e exige confirmação explícita', async () => {
    const fixture = setup();
    const el = await addFirstProductAndProceed(fixture);

    const externalCreditTab = el.querySelector<HTMLButtonElement>(
      '[data-testid="select-method-external-credit"]',
    )!;
    const externalDebitTab = el.querySelector<HTMLButtonElement>(
      '[data-testid="select-method-external-debit"]',
    )!;

    expect(externalCreditTab).not.toBeNull();
    expect(externalDebitTab).not.toBeNull();

    externalCreditTab.click();
    fixture.detectChanges();

    expect(payExternalSpy).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Venda aberta',
    );
    expect(el.textContent).not.toContain('Venda concluída');
    expect(el.querySelector('[data-testid="external-approve-btn"]')?.textContent).toContain(
      'Aprovado na máquina',
    );
    expect(el.querySelector('[data-testid="external-decline-btn"]')?.textContent).toContain(
      'Não aprovado na máquina',
    );

    externalDebitTab.click();
    fixture.detectChanges();

    expect(payExternalSpy).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Venda aberta',
    );
    expect(el.textContent).not.toContain('Venda concluída');
  });

  it('US07 CA1: clicar em Aprovado na máquina para Crédito externo conclui a venda exibindo Crédito externo', async () => {
    const fixture = setup();
    const approvedResponse: PaymentResponse = {
      payment: {
        id: 'pay-ext-credit-1',
        saleId: 'sale-1',
        method: 'EXTERNAL_CREDIT',
        status: 'APPROVED',
        amountCents: 2500,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-27T15:00:00.000Z',
      },
      sale: {
        ...openSale,
        status: 'COMPLETED',
        completedAt: '2026-11-27T15:00:01.000Z',
      },
    };
    payExternalSpy.mockReturnValue(of(approvedResponse));

    const el = await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-external-credit"]')!.click();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('[data-testid="external-approve-btn"]')!.click();
    fixture.detectChanges();

    expect(payExternalSpy).toHaveBeenCalledTimes(1);
    expect(payExternalSpy).toHaveBeenCalledWith('sale-1', {
      method: 'EXTERNAL_CREDIT',
      approved: true,
    });
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Concluída',
    );
    expect(el.textContent).toContain('Venda concluída');
    expect(el.querySelector('[data-testid="completed-payment-method"]')?.textContent).toContain(
      'Crédito externo',
    );
  });

  it('US07 CA1: clicar em Aprovado na máquina para Débito externo conclui a venda exibindo Débito externo', async () => {
    const fixture = setup();
    const approvedResponse: PaymentResponse = {
      payment: {
        id: 'pay-ext-debit-1',
        saleId: 'sale-1',
        method: 'EXTERNAL_DEBIT',
        status: 'APPROVED',
        amountCents: 2500,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-27T15:05:00.000Z',
      },
      sale: {
        ...openSale,
        status: 'COMPLETED',
        completedAt: '2026-11-27T15:05:01.000Z',
      },
    };
    payExternalSpy.mockReturnValue(of(approvedResponse));

    const el = await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-external-debit"]')!.click();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('[data-testid="external-approve-btn"]')!.click();
    fixture.detectChanges();

    expect(payExternalSpy).toHaveBeenCalledTimes(1);
    expect(payExternalSpy).toHaveBeenCalledWith('sale-1', {
      method: 'EXTERNAL_DEBIT',
      approved: true,
    });
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Concluída',
    );
    expect(el.textContent).toContain('Venda concluída');
    expect(el.querySelector('[data-testid="completed-payment-method"]')?.textContent).toContain(
      'Débito externo',
    );
  });

  it('US07 CA2: clicar em Não aprovado na máquina mantém venda OPEN, exibe alerta sem botão de cartão e permite retentar ou trocar forma', async () => {
    const fixture = setup();
    const declinedResponse: PaymentResponse = {
      payment: {
        id: 'pay-ext-declined-1',
        saleId: 'sale-1',
        method: 'EXTERNAL_DEBIT',
        status: 'DECLINED',
        amountCents: 2500,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-27T15:10:00.000Z',
      },
      sale: openSale,
    };
    payExternalSpy.mockReturnValueOnce(of(declinedResponse));

    const el = await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-external-debit"]')!.click();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('[data-testid="external-decline-btn"]')!.click();
    fixture.detectChanges();

    expect(payExternalSpy).toHaveBeenCalledTimes(1);
    expect(payExternalSpy).toHaveBeenCalledWith('sale-1', {
      method: 'EXTERNAL_DEBIT',
      approved: false,
    });
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Venda aberta',
    );
    expect(el.textContent).not.toContain('Venda concluída');

    const declinedAlert = el.querySelector('[data-testid="payment-declined-alert"]');
    expect(declinedAlert).not.toBeNull();
    expect(declinedAlert?.getAttribute('role')).toBe('alert');
    expect(declinedAlert?.textContent).toContain('não aprovado');
    expect(el.querySelector('[data-testid="retry-card"]')).toBeNull();

    // Pode tentar novamente na mesma forma externa
    const approveBtn = el.querySelector<HTMLButtonElement>('[data-testid="external-approve-btn"]')!;
    const declineBtn = el.querySelector<HTMLButtonElement>('[data-testid="external-decline-btn"]')!;
    expect(approveBtn.disabled).toBe(false);
    expect(declineBtn.disabled).toBe(false);

    // Também pode trocar de forma de pagamento
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="generate-pix"]')).not.toBeNull();
  });

  it('US07 CA5: desabilita botões de confirmação e seletores durante envio em andamento para evitar duplo clique', async () => {
    const fixture = setup();
    const external$ = new Subject<PaymentResponse>();
    payExternalSpy.mockReturnValue(external$.asObservable());

    const el = await addFirstProductAndProceed(fixture);

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-external-credit"]')!.click();
    fixture.detectChanges();

    const approveBtn = el.querySelector<HTMLButtonElement>('[data-testid="external-approve-btn"]')!;
    const declineBtn = el.querySelector<HTMLButtonElement>('[data-testid="external-decline-btn"]')!;
    const pixTab = el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!;

    approveBtn.click();
    fixture.detectChanges();

    expect(approveBtn.disabled).toBe(true);
    expect(declineBtn.disabled).toBe(true);
    expect(pixTab.disabled).toBe(true);

    // Cliques adicionais enquanto carrega não disparam novas requisições
    approveBtn.click();
    declineBtn.click();
    expect(payExternalSpy).toHaveBeenCalledTimes(1);

    external$.next({
      payment: {
        id: 'pay-ext-credit-2',
        saleId: 'sale-1',
        method: 'EXTERNAL_CREDIT',
        status: 'APPROVED',
        amountCents: 2500,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-27T15:12:00.000Z',
      },
      sale: {
        ...openSale,
        status: 'COMPLETED',
        completedAt: '2026-11-27T15:12:01.000Z',
      },
    });
    external$.complete();
    fixture.detectChanges();

    expect(el.textContent).toContain('Venda concluída');
  });

  it('US07 CA6: trocar de método externo sem confirmar nunca dispara requisição e erro de rede mantém venda OPEN com alerta claro', async () => {
    const fixture = setup();
    const el = await addFirstProductAndProceed(fixture);

    // Troca entre métodos sem confirmar
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-external-credit"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-external-debit"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-external-credit"]')!.click();
    fixture.detectChanges();

    expect(payExternalSpy).not.toHaveBeenCalled();

    // Simula erro de rede ao confirmar
    payExternalSpy.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );

    const approveBtn = el.querySelector<HTMLButtonElement>('[data-testid="external-approve-btn"]')!;
    const declineBtn = el.querySelector<HTMLButtonElement>('[data-testid="external-decline-btn"]')!;
    approveBtn.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Venda aberta',
    );
    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).not.toContain('Venda concluída');
    expect(approveBtn.disabled).toBe(false);
    expect(declineBtn.disabled).toBe(false);
  });

  it('US08 CA1: exibe resumo completo da venda concluída (itens, quantidades, subtotais, total e forma de pagamento) para Cartão de crédito sem botão de cancelar', async () => {
    const fixture = setup();
    const multiItemSale: Sale = {
      ...openSale,
      totalCents: 3300,
      items: [
        {
          id: 'item-1',
          saleId: 'sale-1',
          productId: 'prod-1',
          quantity: 2,
          unitPriceCents: 1250,
          product: sampleProducts[0],
        },
        {
          id: 'item-2',
          saleId: 'sale-1',
          productId: 'prod-2',
          quantity: 1,
          unitPriceCents: 800,
          product: sampleProducts[1],
        },
      ],
    };
    createSaleSpy.mockReturnValue(of(multiItemSale));
    payWithCardSpy.mockReturnValue(
      of({
        payment: {
          id: 'pay-card-ok',
          saleId: 'sale-1',
          method: 'CARD',
          status: 'APPROVED',
          amountCents: 3300,
          gatewayPaymentId: 'mp-card-ok',
          qrCode: null,
          qrCodeBase64: null,
          createdAt: '2026-11-27T18:00:00.000Z',
        },
        sale: {
          ...multiItemSale,
          status: 'COMPLETED',
          completedAt: '2026-11-27T18:00:01.000Z',
        },
      } satisfies PaymentResponse),
    );

    const el = await addFirstProductAndProceed(fixture);

    await capturedBrickConfig!.callbacks.onSubmit({
      token: 'tok_approved',
      payment_method_id: 'master',
      installments: 1,
      payer: { identification: { type: 'CPF', number: '19119119100' } },
    });
    fixture.detectChanges();

    const summary = el.querySelector('[data-testid="completed-sale-summary"]');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('Café Espresso');
    expect(summary?.textContent).toContain('2 un');
    expect(summary?.textContent).toContain('25,00');
    expect(summary?.textContent).toContain('Pão de Queijo');
    expect(summary?.textContent).toContain('1 un');
    expect(summary?.textContent).toContain('8,00');
    expect(summary?.textContent).toContain('33,00');
    expect(el.querySelector('[data-testid="completed-payment-method"]')?.textContent).toContain(
      'Cartão de crédito',
    );
    expect(el.querySelector('[data-testid="cancel-sale-btn"]')).toBeNull();
  });

  it('US08 CA1: exibe resumo completo com rótulo correto para PIX (após polling), Crédito do cliente, Crédito externo e Débito externo, usando fallback do carrinho quando sale.items não vier preenchido', async () => {
    // 1. PIX confirmado via polling sem items na resposta do sale
    const fixturePix = setup();
    const poll$ = new Subject<Sale>();
    payWithPixSpy.mockReturnValue(
      of({
        payment: {
          id: 'pay-pix-ok',
          saleId: 'sale-1',
          method: 'PIX',
          status: 'PENDING',
          amountCents: 1250,
          gatewayPaymentId: 'mp-pix-ok',
          qrCode: '00020126-pix',
          qrCodeBase64: null,
          createdAt: '2026-11-27T18:01:00.000Z',
        },
        sale: { ...openSale, totalCents: 1250, status: 'PENDING', items: undefined },
      } satisfies PaymentResponse),
    );
    pollSaleUntilSettledSpy.mockReturnValue(poll$.asObservable());

    const elPix = await addFirstProductAndProceed(fixturePix);
    elPix.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixturePix.detectChanges();
    elPix.querySelector<HTMLButtonElement>('[data-testid="generate-pix"]')!.click();
    fixturePix.detectChanges();

    poll$.next({
      ...openSale,
      totalCents: 1250,
      status: 'COMPLETED',
      completedAt: '2026-11-27T18:01:10.000Z',
      items: undefined,
    });
    poll$.complete();
    fixturePix.detectChanges();

    const pixSummary = elPix.querySelector('[data-testid="completed-sale-summary"]');
    expect(pixSummary).not.toBeNull();
    expect(pixSummary?.textContent).toContain('Café Espresso');
    expect(pixSummary?.textContent).toContain('1 un');
    expect(pixSummary?.textContent).toContain('12,50');
    expect(elPix.querySelector('[data-testid="completed-payment-method"]')?.textContent).toContain(
      'PIX',
    );
    expect(elPix.querySelector('[data-testid="cancel-sale-btn"]')).toBeNull();
    fixturePix.destroy();
    TestBed.resetTestingModule();

    // 2. Crédito do cliente
    const fixtureCredit = setup();
    const saleWithCustomer: Sale = {
      ...openSale,
      customerId: 'cust-1',
      customer: sampleCustomers[0],
    };
    createSaleSpy.mockReturnValue(of(saleWithCustomer));
    payWithCustomerCreditSpy.mockReturnValue(
      of({
        sale: {
          ...saleWithCustomer,
          status: 'COMPLETED',
          completedAt: '2026-11-27T18:02:00.000Z',
        },
        payment: {
          id: 'pay-cc-ok',
          saleId: 'sale-1',
          method: 'CUSTOMER_CREDIT',
          status: 'APPROVED',
          amountCents: 2500,
          gatewayPaymentId: null,
          qrCode: null,
          qrCodeBase64: null,
          createdAt: '2026-11-27T18:02:00.000Z',
        },
        customerBalanceCents: 12500,
      } satisfies CustomerCreditPaymentResult),
    );

    const elCredit = await addFirstProductAndProceed(fixtureCredit);
    elCredit
      .querySelector<HTMLButtonElement>('[data-testid="select-method-customer-credit"]')!
      .click();
    fixtureCredit.detectChanges();
    elCredit.querySelector<HTMLButtonElement>('[data-testid="confirm-customer-credit"]')!.click();
    fixtureCredit.detectChanges();

    expect(
      elCredit.querySelector('[data-testid="completed-sale-summary"]')?.textContent,
    ).toContain('Café Espresso');
    expect(
      elCredit.querySelector('[data-testid="completed-payment-method"]')?.textContent,
    ).toContain('Crédito do cliente');
    expect(elCredit.querySelector('[data-testid="cancel-sale-btn"]')).toBeNull();
    fixtureCredit.destroy();
    TestBed.resetTestingModule();

    // 3. Crédito externo e 4. Débito externo
    for (const [method, testId, expectedLabel] of [
      ['EXTERNAL_CREDIT', 'select-method-external-credit', 'Crédito externo'],
      ['EXTERNAL_DEBIT', 'select-method-external-debit', 'Débito externo'],
    ] as const) {
      const fixtureExt = setup();
      payExternalSpy.mockReturnValue(
        of({
          payment: {
            id: `pay-${method}`,
            saleId: 'sale-1',
            method,
            status: 'APPROVED',
            amountCents: 2500,
            gatewayPaymentId: null,
            qrCode: null,
            qrCodeBase64: null,
            createdAt: '2026-11-27T18:03:00.000Z',
          },
          sale: {
            ...openSale,
            status: 'COMPLETED',
            completedAt: '2026-11-27T18:03:01.000Z',
          },
        } satisfies PaymentResponse),
      );

      const elExt = await addFirstProductAndProceed(fixtureExt);
      elExt.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!.click();
      fixtureExt.detectChanges();
      elExt.querySelector<HTMLButtonElement>('[data-testid="external-approve-btn"]')!.click();
      fixtureExt.detectChanges();

      expect(
        elExt.querySelector('[data-testid="completed-sale-summary"]')?.textContent,
      ).toContain('Café Espresso');
      expect(
        elExt.querySelector('[data-testid="completed-payment-method"]')?.textContent,
      ).toContain(expectedLabel);
      expect(elExt.querySelector('[data-testid="cancel-sale-btn"]')).toBeNull();
      fixtureExt.destroy();
      TestBed.resetTestingModule();
    }
  });

  it('US08 CA2: telas OPEN e PENDING não oferecem atalho para concluir venda sem pagamento confirmado', async () => {
    const fixture = setup();
    const pendingSale: Sale = { ...openSale, status: 'PENDING' };
    payWithPixSpy.mockReturnValue(
      of({
        payment: {
          id: 'pay-pix-pending',
          saleId: 'sale-1',
          method: 'PIX',
          status: 'PENDING',
          amountCents: 2500,
          gatewayPaymentId: 'mp-pix-pending',
          qrCode: '00020126-pending',
          qrCodeBase64: null,
          createdAt: '2026-11-27T18:04:00.000Z',
        },
        sale: pendingSale,
      } satisfies PaymentResponse),
    );

    const el = await addFirstProductAndProceed(fixture);

    const openButtons = Array.from(el.querySelectorAll('button')).map((b) =>
      (b.textContent ?? '').toLowerCase(),
    );
    expect(openButtons.some((text) => text.includes('concluir'))).toBe(false);
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Venda aberta',
    );

    el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="generate-pix"]')!.click();
    fixture.detectChanges();

    const pendingButtons = Array.from(el.querySelectorAll('button')).map((b) =>
      (b.textContent ?? '').toLowerCase(),
    );
    expect(pendingButtons.some((text) => text.includes('concluir'))).toBe(false);
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Pendente — aguardando pagamento',
    );
  });

  it('US08 CA3: cancelar venda OPEN com confirmação explícita chama cancelSale, desmonta Card Brick e exibe Cancelada — nenhum valor recebido com botão Nova venda', async () => {
    const fixture = setup();
    const canceledSale: Sale = {
      ...openSale,
      status: 'CANCELED',
      completedAt: null,
    };
    cancelSaleSpy.mockReturnValue(of(canceledSale));

    const el = await addFirstProductAndProceed(fixture);

    const cancelBtn = el.querySelector<HTMLButtonElement>('[data-testid="cancel-sale-btn"]');
    expect(cancelBtn).not.toBeNull();
    cancelBtn!.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();
    expect(cancelSaleSpy).not.toHaveBeenCalled();

    el.querySelector<HTMLButtonElement>('[data-testid="confirm-cancel-btn"]')!.click();
    fixture.detectChanges();

    expect(cancelSaleSpy).toHaveBeenCalledTimes(1);
    expect(cancelSaleSpy).toHaveBeenCalledWith('sale-1');
    expect(brickUnmountSpy).toHaveBeenCalled();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Cancelada — nenhum valor recebido',
    );
    expect(el.textContent).toContain('Cancelada — nenhum valor recebido');
    expect(el.querySelector('[data-testid="new-sale"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="cancel-sale-btn"]')).toBeNull();
  });

  it('US08 CA3: cancelar venda PENDING com confirmação explícita encerra polling e exibe Cancelada — nenhum valor recebido com botão Nova venda', async () => {
    const fixture = setup();
    const pendingSale: Sale = { ...openSale, status: 'PENDING' };
    const canceledSale: Sale = { ...openSale, status: 'CANCELED', completedAt: null };
    let unsubscribed = false;
    const poll$ = new Observable<Sale>(() => {
      return () => {
        unsubscribed = true;
      };
    });

    payWithPixSpy.mockReturnValue(
      of({
        payment: {
          id: 'pay-pix-cancel',
          saleId: 'sale-1',
          method: 'PIX',
          status: 'PENDING',
          amountCents: 2500,
          gatewayPaymentId: 'mp-pix-cancel',
          qrCode: '00020126-cancel',
          qrCodeBase64: null,
          createdAt: '2026-11-27T18:05:00.000Z',
        },
        sale: pendingSale,
      } satisfies PaymentResponse),
    );
    pollSaleUntilSettledSpy.mockReturnValue(poll$);
    cancelSaleSpy.mockReturnValue(of(canceledSale));

    const el = await addFirstProductAndProceed(fixture);
    el.querySelector<HTMLButtonElement>('[data-testid="select-method-pix"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="generate-pix"]')!.click();
    fixture.detectChanges();

    expect(unsubscribed).toBe(false);

    el.querySelector<HTMLButtonElement>('[data-testid="cancel-sale-btn"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="confirm-cancel-btn"]')!.click();
    fixture.detectChanges();

    expect(cancelSaleSpy).toHaveBeenCalledWith('sale-1');
    expect(unsubscribed).toBe(true);
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Cancelada — nenhum valor recebido',
    );
    expect(el.querySelector('[data-testid="new-sale"]')).not.toBeNull();
  });

  it('US08 CA6: botão Cancelar venda [F8] fica desabilitado com carrinho vazio, abre confirmação por clique ou F8, mantém carrinho com Voltar/Esc e limpa tudo ao confirmar', async () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const cancelCartBtn = el.querySelector<HTMLButtonElement>('[data-testid="cancel-cart-btn"]');
    expect(cancelCartBtn).not.toBeNull();
    expect(cancelCartBtn?.textContent).toContain('Cancelar venda [F8]');
    expect(cancelCartBtn?.disabled).toBe(true);

    // F8 com carrinho vazio não abre modal
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();

    // Adiciona item, altera quantidade, gera erro de código e seleciona cliente
    addByBarcodeClick(fixture, '7890000000001');
    const qtyInput = el.querySelector<HTMLInputElement>('[data-testid="quantity-input"]')!;
    qtyInput.value = '3';
    qtyInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    addByBarcodeClick(fixture, '0000000000000');

    el.querySelector<HTMLButtonElement>('[data-testid="identify-customer-btn"]')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="select-customer-cust-1"]')!.click();
    fixture.detectChanges();

    expect(cancelCartBtn?.disabled).toBe(false);
    expect(el.querySelector('[data-testid="selected-customer-name"]')?.textContent).toContain(
      'Ana Clara',
    );
    expect(el.querySelector('[data-testid="barcode-error"]')).not.toBeNull();

    // Abre por clique e desiste com Voltar
    cancelCartBtn!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('[data-testid="dismiss-cancel-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(el.textContent).toContain('Café Espresso');
    expect(el.querySelector('[data-testid="selected-customer-name"]')?.textContent).toContain(
      'Ana Clara',
    );

    // Abre por F8 e desiste com Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(el.textContent).toContain('Café Espresso');

    // Abre novamente por F8 e confirma
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="confirm-cancel-btn"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(el.textContent).toContain(
      'Nenhum produto adicionado. Bipe um código de barras ou busque por nome para iniciar a venda.',
    );
    expect(el.querySelector<HTMLInputElement>('[data-testid="quantity-input"]')?.value).toBe('1');
    expect(el.querySelector('[data-testid="barcode-error"]')).toBeNull();
    expect(el.querySelector('[data-testid="selected-customer-name"]')).toBeNull();
    expect(cancelCartBtn?.disabled).toBe(true);
    expect(cancelSaleSpy).not.toHaveBeenCalled();
    expect(createSaleSpy).not.toHaveBeenCalled();
  });

  it('US08 CA7: desistir com Voltar ou Esc na tela de pagamento não dispara cancelSale; durante carregamento desabilita botões e erro de rede mantém venda e permite retentar', async () => {
    const fixture = setup();
    const cancel$ = new Subject<Sale>();
    cancelSaleSpy.mockReturnValue(cancel$.asObservable());

    const el = await addFirstProductAndProceed(fixture);

    // Abre confirmação e desiste com Voltar
    el.querySelector<HTMLButtonElement>('[data-testid="cancel-sale-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();

    el.querySelector<HTMLButtonElement>('[data-testid="dismiss-cancel-btn"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(cancelSaleSpy).not.toHaveBeenCalled();

    // Abre confirmação e desiste com Escape
    el.querySelector<HTMLButtonElement>('[data-testid="cancel-sale-btn"]')!.click();
    fixture.detectChanges();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(cancelSaleSpy).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Venda aberta',
    );

    // Confirma e verifica carregamento (botões desabilitados, sem duplo clique)
    el.querySelector<HTMLButtonElement>('[data-testid="cancel-sale-btn"]')!.click();
    fixture.detectChanges();

    const confirmBtn = el.querySelector<HTMLButtonElement>('[data-testid="confirm-cancel-btn"]')!;
    const dismissBtn = el.querySelector<HTMLButtonElement>('[data-testid="dismiss-cancel-btn"]')!;
    confirmBtn.click();
    fixture.detectChanges();

    expect(confirmBtn.disabled).toBe(true);
    expect(dismissBtn.disabled).toBe(true);
    confirmBtn.click();
    expect(cancelSaleSpy).toHaveBeenCalledTimes(1);

    // Erro de rede mantém venda OPEN, exibe erro claro e permite tentar novamente
    cancel$.error(new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Venda aberta',
    );
    const errorEl = el.querySelector('[data-testid="cancel-sale-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.getAttribute('role')).toBe('alert');
    expect(errorEl?.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(confirmBtn.disabled).toBe(false);
    expect(dismissBtn.disabled).toBe(false);

    // Nova tentativa após erro consegue concluir o cancelamento
    cancelSaleSpy.mockReturnValueOnce(
      of({ ...openSale, status: 'CANCELED', completedAt: null }),
    );
    confirmBtn.click();
    fixture.detectChanges();

    expect(cancelSaleSpy).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="sale-status-badge"]')?.textContent).toContain(
      'Cancelada — nenhum valor recebido',
    );
  });
});
