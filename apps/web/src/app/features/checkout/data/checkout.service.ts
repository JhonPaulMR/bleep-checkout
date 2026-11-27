import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  EMPTY,
  interval,
  map,
  Observable,
  switchMap,
  takeWhile,
  throwError,
} from 'rxjs';
import { API_URL } from '../../../core/config/api-url';

export type SaleStatus = 'OPEN' | 'PENDING' | 'COMPLETED' | 'CANCELED';

export type PaymentMethod =
  | 'CARD'
  | 'PIX'
  | 'CUSTOMER_CREDIT'
  | 'EXTERNAL_CREDIT'
  | 'EXTERNAL_DEBIT';

export type ExternalPaymentMethod = 'EXTERNAL_CREDIT' | 'EXTERNAL_DEBIT';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ABANDONED';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  priceCents: number;
  active: boolean;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  product?: Product;
}

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  gatewayPaymentId: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  createdAt: string;
}

export interface CheckoutCustomer {
  id: string;
  name: string;
  cpf: string;
  balanceCents: number;
  createdAt?: string;
}

export interface Sale {
  id: string;
  number: number;
  operatorId: string;
  status: SaleStatus;
  totalCents: number;
  createdAt: string;
  completedAt: string | null;
  customerId?: string | null;
  customer?: CheckoutCustomer | null;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface PaymentConfig {
  publicKey: string;
}

export interface CreateSaleItemPayload {
  productId: string;
  quantity: number;
}

export interface PayWithCardPayload {
  token: string;
  paymentMethodId: string;
  installments: number;
  identification: {
    type: string;
    number: string;
  };
  payerEmail?: string;
}

export interface PayExternalPayload {
  method: ExternalPaymentMethod;
  approved: boolean;
}

export interface PaymentResponse {
  payment: Payment;
  sale: Sale;
}

export interface CustomerCreditPaymentResult {
  sale: Sale;
  payment: Payment;
  customerBalanceCents: number;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  listProducts(): Observable<Product[]> {
    return this.http
      .get<{ data: Product[] }>(`${this.apiUrl}/products`)
      .pipe(map((response) => response.data));
  }

  listCustomers(): Observable<CheckoutCustomer[]> {
    return this.http
      .get<{ data: CheckoutCustomer[] }>(`${this.apiUrl}/customers`)
      .pipe(map((response) => response.data));
  }

  findProductByBarcode(barcode: string): Observable<Product> {
    const encoded = encodeURIComponent(barcode.trim());
    return this.http
      .get<{ data: Product }>(`${this.apiUrl}/products/barcode/${encoded}`)
      .pipe(map((response) => response.data));
  }

  searchProducts(term: string): Observable<Product[]> {
    const trimmed = term.trim();
    const url = trimmed
      ? `${this.apiUrl}/products?search=${encodeURIComponent(trimmed)}`
      : `${this.apiUrl}/products`;

    return this.http
      .get<{ data: Product[] }>(url)
      .pipe(map((response) => response.data));
  }

  createSale(items: CreateSaleItemPayload[], customerId?: string): Observable<Sale> {
    const sanitizedItems = items.map(({ productId, quantity }) => ({ productId, quantity }));
    const trimmedCustomerId = customerId?.trim();
    const payload = trimmedCustomerId
      ? { items: sanitizedItems, customerId: trimmedCustomerId }
      : { items: sanitizedItems };

    return this.http
      .post<{ data: Sale }>(`${this.apiUrl}/sales`, payload)
      .pipe(map((response) => response.data));
  }

  getSale(saleId: string): Observable<Sale> {
    return this.http
      .get<{ data: Sale }>(`${this.apiUrl}/sales/${saleId}`)
      .pipe(map((response) => response.data));
  }

  pollSaleUntilSettled(saleId: string, intervalMs = 3000): Observable<Sale> {
    return interval(intervalMs).pipe(
      switchMap(() =>
        this.getSale(saleId).pipe(
          catchError((err: unknown) => {
            if (err instanceof HttpErrorResponse && err.status === 401) {
              return throwError(() => err);
            }
            return EMPTY;
          }),
        ),
      ),
      takeWhile((sale) => sale.status === 'PENDING', true),
    );
  }

  getPaymentConfig(): Observable<PaymentConfig> {
    return this.http
      .get<{ data: PaymentConfig }>(`${this.apiUrl}/payments/config`)
      .pipe(map((response) => response.data));
  }

  payWithCard(saleId: string, payload: PayWithCardPayload): Observable<PaymentResponse> {
    const sanitizedPayload: PayWithCardPayload = {
      token: payload.token,
      paymentMethodId: payload.paymentMethodId,
      installments: payload.installments,
      identification: {
        type: payload.identification.type,
        number: payload.identification.number,
      },
      ...(payload.payerEmail ? { payerEmail: payload.payerEmail } : {}),
    };

    return this.http
      .post<{ data: PaymentResponse }>(`${this.apiUrl}/sales/${saleId}/payments/card`, sanitizedPayload)
      .pipe(map((response) => response.data));
  }

  payWithPix(saleId: string): Observable<PaymentResponse> {
    return this.http
      .post<{ data: PaymentResponse }>(`${this.apiUrl}/sales/${saleId}/payments/pix`, {})
      .pipe(map((response) => response.data));
  }

  payWithCustomerCredit(saleId: string): Observable<CustomerCreditPaymentResult> {
    return this.http
      .post<{ data: CustomerCreditPaymentResult }>(
        `${this.apiUrl}/sales/${encodeURIComponent(saleId)}/payments/credit`,
        {},
      )
      .pipe(map((response) => response.data));
  }

  payExternal(saleId: string, payload: PayExternalPayload): Observable<PaymentResponse> {
    const sanitizedPayload: PayExternalPayload = {
      method: payload.method,
      approved: payload.approved,
    };

    return this.http
      .post<{ data: PaymentResponse }>(
        `${this.apiUrl}/sales/${encodeURIComponent(saleId)}/payments/external`,
        sanitizedPayload,
      )
      .pipe(map((response) => response.data));
  }
}
