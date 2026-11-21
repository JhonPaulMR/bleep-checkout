import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../../core/config/api-url';
import { Operator, OperatorsService } from './operators.service';

describe('OperatorsService', () => {
  let service: OperatorsService;
  let controller: HttpTestingController;
  let apiUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OperatorsService);
    controller = TestBed.inject(HttpTestingController);
    apiUrl = TestBed.inject(API_URL);
  });

  afterEach(() => {
    controller.verify();
  });

  it('list() faz GET /users e desembrulha { data }', () => {
    const operators: Operator[] = [
      {
        id: 'op-1',
        name: 'João Caixa',
        email: 'joao@bleep.local',
        role: 'OPERATOR',
        createdById: 'mgr-1',
        createdAt: '2026-11-21T10:00:00.000Z',
      },
    ];
    let result: Operator[] | undefined;

    service.list().subscribe((data) => {
      result = data;
    });

    const req = controller.expectOne(`${apiUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: operators });

    expect(result).toEqual(operators);
  });

  it('create(payload) faz POST /users com { name, email, password } e desembrulha { data }', () => {
    const payload = {
      name: 'Maria Operadora',
      email: 'maria@bleep.local',
      password: 'Password123',
    };
    const created: Operator = {
      id: 'op-2',
      name: payload.name,
      email: payload.email,
      role: 'OPERATOR',
      createdById: 'mgr-1',
      createdAt: '2026-11-21T10:05:00.000Z',
    };
    let result: Operator | undefined;

    service.create(payload).subscribe((data) => {
      result = data;
    });

    const req = controller.expectOne(`${apiUrl}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: created });

    expect(result).toEqual(created);
  });
});
