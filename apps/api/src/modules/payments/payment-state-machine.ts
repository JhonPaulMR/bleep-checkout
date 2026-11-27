import { PaymentStatus, SaleStatus } from '../../../generated/prisma/enums.js';

const SALE_TRANSITIONS: Record<SaleStatus, ReadonlySet<SaleStatus>> = {
  [SaleStatus.OPEN]: new Set([
    SaleStatus.COMPLETED,
    SaleStatus.PENDING,
    SaleStatus.CANCELED,
  ]),
  [SaleStatus.PENDING]: new Set([
    SaleStatus.COMPLETED,
    SaleStatus.OPEN,
    SaleStatus.CANCELED,
  ]),
  [SaleStatus.COMPLETED]: new Set(),
  [SaleStatus.CANCELED]: new Set(),
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  [PaymentStatus.PENDING]: new Set([
    PaymentStatus.APPROVED,
    PaymentStatus.DECLINED,
    PaymentStatus.ABANDONED,
  ]),
  [PaymentStatus.APPROVED]: new Set(),
  [PaymentStatus.DECLINED]: new Set(),
  [PaymentStatus.ABANDONED]: new Set(),
};

export function canTransitionSale(from: SaleStatus, to: SaleStatus): boolean {
  return SALE_TRANSITIONS[from].has(to);
}

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return PAYMENT_TRANSITIONS[from].has(to);
}
