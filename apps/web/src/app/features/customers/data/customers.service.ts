import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../../../core/config/api-url';

export interface Customer {
  id: string;
  name: string;
  cpf: string;
  balanceCents: number;
  createdAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  cpf: string;
  balanceCents: number;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  list(): Observable<Customer[]> {
    return this.http
      .get<{ data: Customer[] }>(`${this.apiUrl}/customers`)
      .pipe(map((response) => response.data));
  }

  create(payload: CreateCustomerPayload): Observable<Customer> {
    return this.http
      .post<{ data: Customer }>(`${this.apiUrl}/customers`, payload)
      .pipe(map((response) => response.data));
  }
}
