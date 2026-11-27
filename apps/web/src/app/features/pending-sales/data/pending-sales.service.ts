import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../../../core/config/api-url';

export type PendingSaleStatus = 'OPEN' | 'PENDING' | 'COMPLETED' | 'CANCELED';

export type PendingSalePaymentMethod =
  | 'CARD'
  | 'PIX'
  | 'CUSTOMER_CREDIT'
  | 'EXTERNAL_CREDIT'
  | 'EXTERNAL_DEBIT';

export type PendingSalePaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ABANDONED';

export interface PendingSaleProduct {
  id: string;
  name: string;
  barcode: string;
  priceCents: number;
  active: boolean;
  createdAt: string;
}

export interface PendingSaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  product?: PendingSaleProduct;
}

export interface PendingSalePayment {
  id: string;
  saleId: string;
  method: PendingSalePaymentMethod;
  status: PendingSalePaymentStatus;
  amountCents: number;
  gatewayPaymentId: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  createdAt: string;
}

export interface PendingSaleCustomer {
  id: string;
  name: string;
  cpf: string;
  balanceCents: number;
  createdAt?: string;
}

export interface PendingSale {
  id: string;
  number: number;
  operatorId: string;
  status: PendingSaleStatus;
  totalCents: number;
  createdAt: string;
  completedAt: string | null;
  customerId?: string | null;
  customer?: PendingSaleCustomer | null;
  items?: PendingSaleItem[];
  payments?: PendingSalePayment[];
}

@Injectable({ providedIn: 'root' })
export class PendingSalesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  listPendingSales(): Observable<PendingSale[]> {
    return this.http
      .get<{ data: PendingSale[] }>(`${this.apiUrl}/sales?status=PENDING`)
      .pipe(map((response) => response.data));
  }

  cancelSale(saleId: string): Observable<PendingSale> {
    return this.http
      .post<{ data: PendingSale }>(`${this.apiUrl}/sales/${encodeURIComponent(saleId)}/cancel`, {})
      .pipe(map((response) => response.data));
  }

  reopenSale(saleId: string): Observable<PendingSale> {
    return this.http
      .post<{ data: PendingSale }>(`${this.apiUrl}/sales/${encodeURIComponent(saleId)}/reopen`, {})
      .pipe(map((response) => response.data));
  }
}
