import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { Customer, CustomersService } from './customers.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let controller: HttpTestingController;
  let apiUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CustomersService);
    controller = TestBed.inject(HttpTestingController);
    apiUrl = TestBed.inject(API_URL);
  });

  afterEach(() => {
    controller.verify();
  });

  it('list() faz GET /customers e desembrulha { data }', () => {
    const customers: Customer[] = [
      {
        id: 'cust-1',
        name: 'Ana Costa',
        cpf: '12345678901',
        balanceCents: 5000,
        createdAt: '2026-11-25T10:00:00.000Z',
      },
    ];
    let result: Customer[] | undefined;

    service.list().subscribe((data) => {
      result = data;
    });

    const req = controller.expectOne(`${apiUrl}/customers`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: customers });

    expect(result).toEqual(customers);
  });

  it('create(payload) faz POST /customers com { name, cpf, balanceCents } e desembrulha { data }', () => {
    const payload = {
      name: 'Carlos Mendes',
      cpf: '98765432100',
      balanceCents: 2500,
    };
    const created: Customer = {
      id: 'cust-2',
      name: payload.name,
      cpf: payload.cpf,
      balanceCents: payload.balanceCents,
      createdAt: '2026-11-25T10:05:00.000Z',
    };
    let result: Customer | undefined;

    service.create(payload).subscribe((data) => {
      result = data;
    });

    const req = controller.expectOne(`${apiUrl}/customers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: created });

    expect(result).toEqual(created);
  });

  it('addCredit(id, amountCents) faz POST /customers/:id/credits com { amountCents } e desembrulha { data }', () => {
    const customerId = 'cust-1';
    const amountCents = 3000;
    const updated: Customer = {
      id: customerId,
      name: 'Ana Costa',
      cpf: '12345678901',
      balanceCents: 8000,
      createdAt: '2026-11-25T10:00:00.000Z',
    };
    let result: Customer | undefined;

    service.addCredit(customerId, amountCents).subscribe((data) => {
      result = data;
    });

    const req = controller.expectOne(`${apiUrl}/customers/${customerId}/credits`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amountCents });
    req.flush({ data: updated });

    expect(result).toEqual(updated);
  });
});
