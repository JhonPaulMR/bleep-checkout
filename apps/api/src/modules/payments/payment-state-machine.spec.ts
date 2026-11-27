import { PaymentStatus, SaleStatus } from '../../../generated/prisma/enums.js';
import {
  canTransitionPayment,
  canTransitionSale,
} from './payment-state-machine.js';

describe('payment-state-machine', () => {
  describe('canTransitionSale', () => {
    it.each<[SaleStatus, SaleStatus]>([
      [SaleStatus.OPEN, SaleStatus.COMPLETED],
      [SaleStatus.OPEN, SaleStatus.PENDING],
      [SaleStatus.OPEN, SaleStatus.CANCELED],
      [SaleStatus.PENDING, SaleStatus.COMPLETED],
      [SaleStatus.PENDING, SaleStatus.OPEN],
      [SaleStatus.PENDING, SaleStatus.CANCELED],
    ])('permite transição de %s para %s', (from, to) => {
      expect(canTransitionSale(from, to)).toBe(true);
    });

    it.each<[SaleStatus, SaleStatus]>([
      [SaleStatus.COMPLETED, SaleStatus.OPEN],
      [SaleStatus.COMPLETED, SaleStatus.PENDING],
      [SaleStatus.COMPLETED, SaleStatus.CANCELED],
      [SaleStatus.CANCELED, SaleStatus.OPEN],
      [SaleStatus.CANCELED, SaleStatus.PENDING],
      [SaleStatus.CANCELED, SaleStatus.COMPLETED],
      [SaleStatus.OPEN, SaleStatus.OPEN],
      [SaleStatus.PENDING, SaleStatus.PENDING],
      [SaleStatus.COMPLETED, SaleStatus.COMPLETED],
      [SaleStatus.CANCELED, SaleStatus.CANCELED],
    ])('bloqueia transição de %s para %s', (from, to) => {
      expect(canTransitionSale(from, to)).toBe(false);
    });
  });

  describe('canTransitionPayment', () => {
    it.each<[PaymentStatus, PaymentStatus]>([
      [PaymentStatus.PENDING, PaymentStatus.APPROVED],
      [PaymentStatus.PENDING, PaymentStatus.DECLINED],
      [PaymentStatus.PENDING, PaymentStatus.ABANDONED],
    ])('permite transição de %s para %s', (from, to) => {
      expect(canTransitionPayment(from, to)).toBe(true);
    });

    it.each<[PaymentStatus, PaymentStatus]>([
      [PaymentStatus.PENDING, PaymentStatus.PENDING],
      [PaymentStatus.APPROVED, PaymentStatus.PENDING],
      [PaymentStatus.APPROVED, PaymentStatus.DECLINED],
      [PaymentStatus.APPROVED, PaymentStatus.ABANDONED],
      [PaymentStatus.APPROVED, PaymentStatus.APPROVED],
      [PaymentStatus.DECLINED, PaymentStatus.PENDING],
      [PaymentStatus.DECLINED, PaymentStatus.APPROVED],
      [PaymentStatus.DECLINED, PaymentStatus.ABANDONED],
      [PaymentStatus.DECLINED, PaymentStatus.DECLINED],
      [PaymentStatus.ABANDONED, PaymentStatus.PENDING],
      [PaymentStatus.ABANDONED, PaymentStatus.APPROVED],
      [PaymentStatus.ABANDONED, PaymentStatus.DECLINED],
      [PaymentStatus.ABANDONED, PaymentStatus.ABANDONED],
    ])('bloqueia transição de %s para %s', (from, to) => {
      expect(canTransitionPayment(from, to)).toBe(false);
    });
  });
});
