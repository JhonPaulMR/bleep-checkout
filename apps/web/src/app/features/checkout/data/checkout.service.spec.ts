import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import {
  CheckoutService,
  PaymentConfig,
  PaymentResponse,
  Product,
  Sale,
} from './checkout.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let controller: HttpTestingController;
  let apiUrl: string;

  const sampleProduct: Product = {
    id: 'prod-1',
    name: 'Café Espresso',
    barcode: '7890000000001',
    priceCents: 1250,
    active: true,
    createdAt: '2026-11-24T10:00:00.000Z',
  };

  const sampleSale: Sale = {
    id: 'sale-1',
    number: 1,
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
        product: sampleProduct,
      },
    ],
    payments: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CheckoutService);
    controller = TestBed.inject(HttpTestingController);
    apiUrl = TestBed.inject(API_URL);
  });

  afterEach(() => {
    vi.useRealTimers();
    controller.verify();
  });

  it('listProducts() faz GET /products e desembrulha { data }', () => {
    let result: Product[] | undefined;

    service.listProducts().subscribe((products) => {
      result = products;
    });

    const req = controller.expectOne(`${apiUrl}/products`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [sampleProduct] });

    expect(result).toEqual([sampleProduct]);
  });

  it('findProductByBarcode() faz GET /products/barcode/:barcode codificado e com trim, desembrulhando { data }', () => {
    let result: Product | undefined;

    service.findProductByBarcode(' 7891000120140 ').subscribe((product) => {
      result = product;
    });

    const req = controller.expectOne(`${apiUrl}/products/barcode/7891000120140`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: sampleProduct });

    expect(result).toEqual(sampleProduct);
  });

  it('searchProducts() com termo preenchido faz GET /products?search=:term codificado e com trim, desembrulhando { data }', () => {
    let result: Product[] | undefined;

    service.searchProducts(' café ').subscribe((products) => {
      result = products;
    });

    const req = controller.expectOne(`${apiUrl}/products?search=caf%C3%A9`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [sampleProduct] });

    expect(result).toEqual([sampleProduct]);
  });

  it('searchProducts() com termo vazio ou só espaços faz GET /products sem query param, desembrulhando { data }', () => {
    let result: Product[] | undefined;

    service.searchProducts('   ').subscribe((products) => {
      result = products;
    });

    const req = controller.expectOne(`${apiUrl}/products`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [sampleProduct] });

    expect(result).toEqual([sampleProduct]);
  });

  it('createSale() faz POST /sales enviando apenas productId e quantity e desembrulha { data }', () => {
    let result: Sale | undefined;

    const payloadWithExtraPrice = [
      { productId: 'prod-1', quantity: 2, priceCents: 1 } as unknown as {
        productId: string;
        quantity: number;
      },
    ];

    service.createSale(payloadWithExtraPrice).subscribe((sale) => {
      result = sale;
    });

    const req = controller.expectOne(`${apiUrl}/sales`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      items: [{ productId: 'prod-1', quantity: 2 }],
    });
    expect(req.request.body).not.toHaveProperty('totalCents');
    expect(req.request.body.items[0]).not.toHaveProperty('priceCents');
    req.flush({ data: sampleSale });

    expect(result).toEqual(sampleSale);
  });

  it('getPaymentConfig() faz GET /payments/config e desembrulha { data }', () => {
    let result: PaymentConfig | undefined;

    service.getPaymentConfig().subscribe((config) => {
      result = config;
    });

    const req = controller.expectOne(`${apiUrl}/payments/config`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: { publicKey: 'TEST-public-key-123' } });

    expect(result).toEqual({ publicKey: 'TEST-public-key-123' });
  });

  it('payWithCard() faz POST /sales/:id/payments/card sem enviar transaction_amount ou valor monetário', () => {
    let result: PaymentResponse | undefined;
    const response: PaymentResponse = {
      payment: {
        id: 'pay-1',
        saleId: 'sale-1',
        method: 'CARD',
        status: 'APPROVED',
        amountCents: 2500,
        gatewayPaymentId: 'mp-123',
        qrCode: null,
        qrCodeBase64: null,
        createdAt: '2026-11-24T10:06:00.000Z',
      },
      sale: {
        ...sampleSale,
        status: 'COMPLETED',
        completedAt: '2026-11-24T10:06:01.000Z',
      },
    };

    const payloadWithPrice = {
      token: 'tok_card_123',
      paymentMethodId: 'master',
      installments: 1,
      identification: { type: 'CPF', number: '19119119100' },
      payerEmail: 'operador@bleep.com',
      transaction_amount: 0.01,
      amountCents: 1,
    };

    service.payWithCard('sale-1', payloadWithPrice).subscribe((res) => {
      result = res;
    });

    const req = controller.expectOne(`${apiUrl}/sales/sale-1/payments/card`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      token: 'tok_card_123',
      paymentMethodId: 'master',
      installments: 1,
      identification: { type: 'CPF', number: '19119119100' },
      payerEmail: 'operador@bleep.com',
    });
    expect(req.request.body).not.toHaveProperty('transaction_amount');
    expect(req.request.body).not.toHaveProperty('amountCents');
    req.flush({ data: response });

    expect(result).toEqual(response);
  });

  it('payWithPix() faz POST /sales/:id/payments/pix sem enviar valor e desembrulha { data }', () => {
    let result: PaymentResponse | undefined;
    const response: PaymentResponse = {
      payment: {
        id: 'pay-pix-1',
        saleId: 'sale-1',
        method: 'PIX',
        status: 'PENDING',
        amountCents: 2500,
        gatewayPaymentId: 'mp-pix-123',
        qrCode: '00020126580014br.gov.bcb.pix',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        createdAt: '2026-11-24T10:06:00.000Z',
      },
      sale: {
        ...sampleSale,
        status: 'PENDING',
      },
    };

    service.payWithPix('sale-1').subscribe((res) => {
      result = res;
    });

    const req = controller.expectOne(`${apiUrl}/sales/sale-1/payments/pix`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ data: response });

    expect(result).toEqual(response);
  });

  it('getSale() faz GET /sales/:id e desembrulha { data }', () => {
    let result: Sale | undefined;

    service.getSale('sale-1').subscribe((sale) => {
      result = sale;
    });

    const req = controller.expectOne(`${apiUrl}/sales/sale-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: sampleSale });

    expect(result).toEqual(sampleSale);
  });

  it('pollSaleUntilSettled() consulta GET /sales/:id periodicamente e encerra ao sair de PENDING', async () => {
    vi.useFakeTimers();
    const pendingSale: Sale = { ...sampleSale, status: 'PENDING' };
    const completedSale: Sale = {
      ...sampleSale,
      status: 'COMPLETED',
      completedAt: '2026-11-24T10:07:00.000Z',
    };

    const emitted: Sale[] = [];
    let completed = false;

    service.pollSaleUntilSettled('sale-1', 3000).subscribe({
      next: (sale) => emitted.push(sale),
      complete: () => {
        completed = true;
      },
    });

    await vi.advanceTimersByTimeAsync(3000);
    const req1 = controller.expectOne(`${apiUrl}/sales/sale-1`);
    expect(req1.request.method).toBe('GET');
    req1.flush({ data: pendingSale });
    expect(emitted).toEqual([pendingSale]);
    expect(completed).toBe(false);

    await vi.advanceTimersByTimeAsync(3000);
    const req2 = controller.expectOne(`${apiUrl}/sales/sale-1`);
    req2.flush({ data: completedSale });
    expect(emitted).toEqual([pendingSale, completedSale]);
    expect(completed).toBe(true);

    // Não faz novas chamadas após concluir
    await vi.advanceTimersByTimeAsync(9000);
    controller.expectNone(`${apiUrl}/sales/sale-1`);
  });

  it('pollSaleUntilSettled() ignora erros transitórios e continua o polling', async () => {
    vi.useFakeTimers();
    const completedSale: Sale = {
      ...sampleSale,
      status: 'COMPLETED',
      completedAt: '2026-11-24T10:07:00.000Z',
    };

    const emitted: Sale[] = [];
    let errored = false;

    service.pollSaleUntilSettled('sale-1', 3000).subscribe({
      next: (sale) => emitted.push(sale),
      error: () => {
        errored = true;
      },
    });

    await vi.advanceTimersByTimeAsync(3000);
    const req1 = controller.expectOne(`${apiUrl}/sales/sale-1`);
    req1.flush('Erro temporário', { status: 500, statusText: 'Internal Server Error' });
    expect(emitted).toEqual([]);
    expect(errored).toBe(false);

    await vi.advanceTimersByTimeAsync(3000);
    const req2 = controller.expectOne(`${apiUrl}/sales/sale-1`);
    req2.flush({ data: completedSale });
    expect(emitted).toEqual([completedSale]);
    expect(errored).toBe(false);
  });

  it('pollSaleUntilSettled() interrompe e propaga erro 401', async () => {
    vi.useFakeTimers();
    let capturedError: unknown;

    service.pollSaleUntilSettled('sale-1', 3000).subscribe({
      error: (err: unknown) => {
        capturedError = err;
      },
    });

    await vi.advanceTimersByTimeAsync(3000);
    const req1 = controller.expectOne(`${apiUrl}/sales/sale-1`);
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(capturedError).toBeInstanceOf(HttpErrorResponse);
    expect((capturedError as HttpErrorResponse).status).toBe(401);

    // Não deve disparar novas requisições após 401
    await vi.advanceTimersByTimeAsync(9000);
    controller.expectNone(`${apiUrl}/sales/sale-1`);
  });
});
