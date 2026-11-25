import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../../../core/config/api-url';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  priceCents: number;
  active: boolean;
  createdAt: string;
}

export interface CreateProductPayload {
  name: string;
  barcode: string;
  priceCents: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  list(): Observable<Product[]> {
    return this.http
      .get<{ data: Product[] }>(`${this.apiUrl}/products`)
      .pipe(map((response) => response.data));
  }

  create(payload: CreateProductPayload): Observable<Product> {
    return this.http
      .post<{ data: Product }>(`${this.apiUrl}/products`, payload)
      .pipe(map((response) => response.data));
  }
}
