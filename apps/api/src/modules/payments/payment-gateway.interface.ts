export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PayerIdentification {
  type: string;
  number: string;
}

export interface CreateCardPaymentInput {
  transactionAmount: number;
  token: string;
  paymentMethodId: string;
  installments: number;
  payerEmail: string;
  identification: PayerIdentification;
  externalReference: string;
  idempotencyKey: string;
  description?: string;
}

export interface CreatePixPaymentInput {
  transactionAmount: number;
  payerEmail: string;
  externalReference: string;
  idempotencyKey: string;
  description?: string;
}

export type GatewayPaymentStatus =
  | 'approved'
  | 'rejected'
  | 'in_process'
  | 'pending'
  | (string & {});

export interface GatewayPaymentResult {
  id: string;
  status: GatewayPaymentStatus;
  transactionAmount: number;
  externalReference: string | null;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
}

export interface PaymentGateway {
  createCardPayment(
    input: CreateCardPaymentInput,
  ): Promise<GatewayPaymentResult>;
  createPixPayment(input: CreatePixPaymentInput): Promise<GatewayPaymentResult>;
  getPayment(gatewayPaymentId: string): Promise<GatewayPaymentResult>;
}
