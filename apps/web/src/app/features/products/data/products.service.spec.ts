import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { Product, ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let controller: HttpTestingController;
  let apiUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsService);
    controller = TestBed.inject(HttpTestingController);
    apiUrl = TestBed.inject(API_URL);
  });

  afterEach(() => {
    controller.verify();
  });

  it('list() faz GET /products e desembrulha { data }', () => {
    const products: Product[] = [
      {
        id: 'prod-1',
        name: 'Refrigerante Cola 350ml',
        barcode: '7891234567890',
        priceCents: 550,
        active: true,
        createdAt: '2026-11-25T10:00:00.000Z',
      },
    ];
    let result: Product[] | undefined;

    service.list().subscribe((data) => {
      result = data;
    });

    const req = controller.expectOne(`${apiUrl}/products`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: products });

    expect(result).toEqual(products);
  });

  it('create(payload) faz POST /products com { name, barcode, priceCents } e desembrulha { data }', () => {
    const payload = {
      name: 'Biscoito Recheado 140g',
      barcode: '7899876543210',
      priceCents: 399,
    };
    const created: Product = {
      id: 'prod-2',
      name: payload.name,
      barcode: payload.barcode,
      priceCents: payload.priceCents,
      active: true,
      createdAt: '2026-11-25T10:05:00.000Z',
    };
    let result: Product | undefined;

    service.create(payload).subscribe((data) => {
      result = data;
    });

    const req = controller.expectOne(`${apiUrl}/products`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: created });

    expect(result).toEqual(created);
  });
});
