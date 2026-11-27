import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { PendingSale, PendingSalesService } from './pending-sales.service';

describe('PendingSalesService', () => {
  let service: PendingSalesService;
  let controller: HttpTestingController;
  let apiUrl: string;

  const samplePendingSale: PendingSale = {
    id: 'sale-1',
    number: 10,
    operatorId: 'op-1',
    status: 'PENDING',
    totalCents: 2500,
    createdAt: '2026-11-27T14:00:00.000Z',
    completedAt: null,
    customerId: 'cust-1',
    customer: {
      id: 'cust-1',
      name: 'Maria Oliveira',
      cpf: '12345678901',
      balanceCents: 5000,
    },
    items: [
      {
        id: 'item-1',
        saleId: 'sale-1',
        productId: 'prod-1',
        quantity: 2,
        unitPriceCents: 1250,
        product: {
          id: 'prod-1',
          name: 'Café Espresso',
          barcode: '7890000000001',
          priceCents: 1250,
          active: true,
          createdAt: '2026-11-24T10:00:00.000Z',
        },
      },
    ],
    payments: [
      {
        id: 'pay-pix-1',
        saleId: 'sale-1',
        method: 'PIX',
        status: 'PENDING',
        amountCents: 2500,
        gatewayPaymentId: 'mp-pix-123',
        qrCode: '00020126580014br.gov.bcb.pix',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        createdAt: '2026-11-27T14:00:05.000Z',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PendingSalesService);
    controller = TestBed.inject(HttpTestingController);
    apiUrl = TestBed.inject(API_URL);
  });

  afterEach(() => {
    controller.verify();
  });

  it('listPendingSales() faz GET /sales?status=PENDING e desembrulha { data }', () => {
    let result: PendingSale[] | undefined;

    service.listPendingSales().subscribe((sales) => {
      result = sales;
    });

    const req = controller.expectOne(`${apiUrl}/sales?status=PENDING`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [samplePendingSale] });

    expect(result).toEqual([samplePendingSale]);
  });

  it('cancelSale() faz POST /sales/:id/cancel com saleId codificado e corpo vazio, desembrulhando { data }', () => {
    let result: PendingSale | undefined;
    const canceledSale: PendingSale = {
      ...samplePendingSale,
      id: 'sale/1',
      status: 'CANCELED',
      completedAt: null,
    };

    service.cancelSale('sale/1').subscribe((sale) => {
      result = sale;
    });

    const req = controller.expectOne(`${apiUrl}/sales/sale%2F1/cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ data: canceledSale });

    expect(result).toEqual(canceledSale);
  });

  it('reopenSale() faz POST /sales/:id/reopen com saleId codificado e corpo vazio, desembrulhando { data }', () => {
    let result: PendingSale | undefined;
    const reopenedSale: PendingSale = {
      ...samplePendingSale,
      id: 'sale/1',
      status: 'OPEN',
      completedAt: null,
    };

    service.reopenSale('sale/1').subscribe((sale) => {
      result = sale;
    });

    const req = controller.expectOne(`${apiUrl}/sales/sale%2F1/reopen`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ data: reopenedSale });

    expect(result).toEqual(reopenedSale);
  });
});
