import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import {
  CheckoutService,
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
  let listProductsSpy: ReturnType<typeof vi.fn>;
  let createSaleSpy: ReturnType<typeof vi.fn>;
  let pollSaleUntilSettledSpy: ReturnType<typeof vi.fn>;
  let getPaymentConfigSpy: ReturnType<typeof vi.fn>;
  let payWithCardSpy: ReturnType<typeof vi.fn>;
  let payWithPixSpy: ReturnType<typeof vi.fn>;

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

  function setup(options?: { products?: Product[] | Observable<Product[]> }) {
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

    const productsSource = options?.products ?? sampleProducts;
    listProductsSpy = vi.fn().mockReturnValue(
      Array.isArray(productsSource) ? of(productsSource) : productsSource,
    );
    createSaleSpy = vi.fn().mockReturnValue(of(openSale));
    pollSaleUntilSettledSpy = vi.fn().mockReturnValue(new Subject<Sale>().asObservable());
    getPaymentConfigSpy = vi.fn().mockReturnValue(of({ publicKey: 'TEST-public-key-123' }));
    payWithCardSpy = vi.fn();
    payWithPixSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        {
          provide: CheckoutService,
          useValue: {
            listProducts: listProductsSpy,
            createSale: createSaleSpy,
            pollSaleUntilSettled: pollSaleUntilSettledSpy,
            getPaymentConfig: getPaymentConfigSpy,
            payWithCard: payWithCardSpy,
            payWithPix: payWithPixSpy,
          },
        },
      ],
    });

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

  async function addFirstProductAndProceed(fixture: ReturnType<typeof setup>) {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const addButton = el.querySelector<HTMLButtonElement>('[data-testid="add-product-prod-1"]')!;
    addButton.click();
    fixture.detectChanges();

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
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="add-product-prod-1"]')!.click();
    fixture.detectChanges();

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
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('[data-testid="add-product-prod-1"]')!.click();
    fixture.detectChanges();

    const proceedButton = el.querySelector<HTMLButtonElement>('[data-testid="proceed-payment"]')!;
    proceedButton.click();
    fixture.detectChanges();

    expect(proceedButton.disabled).toBe(false);
    expect(el.textContent).toContain('Não foi possível conectar. Tente novamente.');
    expect(el.textContent).not.toContain('Venda concluída');
  });
});
