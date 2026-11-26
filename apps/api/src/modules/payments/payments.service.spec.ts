import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CreditType,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
} from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PaymentGateway } from './payment-gateway.interface.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService', () => {
  let prisma: {
    sale: {
      findUnique: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    payment: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    customer: {
      updateMany: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    creditTransaction: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let gateway: {
    createCardPayment: ReturnType<typeof vi.fn>;
    createPixPayment: ReturnType<typeof vi.fn>;
    getPayment: ReturnType<typeof vi.fn>;
  };
  let service: PaymentsService;

  const baseSale = {
    id: 'sale-1',
    number: 10,
    operatorId: 'op-1',
    status: SaleStatus.OPEN,
    totalCents: 3580,
    createdAt: new Date('2026-11-24T12:00:00.000Z'),
    completedAt: null,
    operator: { email: 'operador@bleep.local' },
  };

  const baseDto = {
    token: 'card-token-123',
    paymentMethodId: 'master',
    installments: 1,
    identification: {
      type: 'CPF',
      number: '19119119100',
    },
  };

  beforeEach(() => {
    prisma = {
      sale: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        update: vi.fn(),
      },
      customer: {
        updateMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      creditTransaction: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );

    gateway = {
      createCardPayment: vi.fn(),
      createPixPayment: vi.fn(),
      getPayment: vi.fn(),
    };

    service = new PaymentsService(
      prisma as unknown as PrismaService,
      gateway as unknown as PaymentGateway,
    );
  });

  describe('payWithCard', () => {
    it('cria Payment antes de chamar o gateway, cobra com valor do banco, externalReference e idempotencyKey, e conclui venda quando approved', async () => {
      prisma.sale.findUnique.mockResolvedValue(baseSale);

      const createdPayment = {
        id: 'pay-1',
        saleId: 'sale-1',
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
        amountCents: 3580,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: new Date('2026-11-24T12:01:00.000Z'),
      };
      prisma.payment.create.mockResolvedValue(createdPayment);

      const callOrder: string[] = [];
      prisma.payment.create.mockImplementation(async () => {
        callOrder.push('payment.create');
        return createdPayment;
      });
      gateway.createCardPayment.mockImplementation(async () => {
        callOrder.push('gateway.createCardPayment');
        return {
          id: 'mp-1001',
          status: 'approved',
          transactionAmount: 35.8,
          externalReference: 'sale-1',
        };
      });

      const updatedPayment = {
        ...createdPayment,
        status: PaymentStatus.APPROVED,
        gatewayPaymentId: 'mp-1001',
      };
      const updatedSale = {
        id: baseSale.id,
        number: baseSale.number,
        operatorId: baseSale.operatorId,
        status: SaleStatus.COMPLETED,
        totalCents: baseSale.totalCents,
        createdAt: baseSale.createdAt,
        completedAt: new Date('2026-11-24T12:01:02.000Z'),
      };
      prisma.payment.update.mockResolvedValue(updatedPayment);
      prisma.sale.update.mockResolvedValue(updatedSale);

      const result = await service.payWithCard('sale-1', baseDto, 'op-1');

      expect(callOrder).toEqual(['payment.create', 'gateway.createCardPayment']);
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-1',
          method: PaymentMethod.CARD,
          status: PaymentStatus.PENDING,
          amountCents: 3580,
        },
      });
      expect(gateway.createCardPayment).toHaveBeenCalledWith({
        transactionAmount: 35.8,
        token: 'card-token-123',
        paymentMethodId: 'master',
        installments: 1,
        payerEmail: 'operador@bleep.local',
        identification: { type: 'CPF', number: '19119119100' },
        externalReference: 'sale-1',
        idempotencyKey: 'pay-1',
        description: 'Venda #10',
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: {
          gatewayPaymentId: 'mp-1001',
          status: PaymentStatus.APPROVED,
        },
      });
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        data: {
          status: SaleStatus.COMPLETED,
          completedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({
        payment: updatedPayment,
        sale: updatedSale,
      });
    });

    it('usa payerEmail do DTO quando informado', async () => {
      prisma.sale.findUnique.mockResolvedValue(baseSale);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-email',
        saleId: 'sale-1',
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
        amountCents: 3580,
        gatewayPaymentId: null,
      });
      gateway.createCardPayment.mockResolvedValue({
        id: 'mp-1002',
        status: 'approved',
        transactionAmount: 35.8,
        externalReference: 'sale-1',
      });
      prisma.payment.update.mockResolvedValue({
        id: 'pay-email',
        status: PaymentStatus.APPROVED,
        gatewayPaymentId: 'mp-1002',
      });
      prisma.sale.update.mockResolvedValue({
        id: 'sale-1',
        status: SaleStatus.COMPLETED,
        completedAt: new Date(),
      });

      await service.payWithCard(
        'sale-1',
        { ...baseDto, payerEmail: 'cliente@sandbox.test' },
        'op-1',
      );

      expect(gateway.createCardPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          payerEmail: 'cliente@sandbox.test',
        }),
      );
    });

    it('marca Payment como DECLINED com gatewayPaymentId e mantém Sale em OPEN quando gateway responde rejected', async () => {
      prisma.sale.findUnique.mockResolvedValue(baseSale);
      const createdPayment = {
        id: 'pay-2',
        saleId: 'sale-1',
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
        amountCents: 3580,
        gatewayPaymentId: null,
      };
      prisma.payment.create.mockResolvedValue(createdPayment);
      gateway.createCardPayment.mockResolvedValue({
        id: 'mp-2001',
        status: 'rejected',
        transactionAmount: 35.8,
        externalReference: 'sale-1',
      });

      const declinedPayment = {
        ...createdPayment,
        status: PaymentStatus.DECLINED,
        gatewayPaymentId: 'mp-2001',
      };
      prisma.payment.update.mockResolvedValue(declinedPayment);

      const result = await service.payWithCard('sale-1', baseDto, 'op-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-2' },
        data: {
          gatewayPaymentId: 'mp-2001',
          status: PaymentStatus.DECLINED,
        },
      });
      expect(prisma.sale.update).not.toHaveBeenCalled();
      expect(result.payment).toEqual(declinedPayment);
      expect(result.sale.status).toBe(SaleStatus.OPEN);
      expect(result.sale.completedAt).toBeNull();
    });

    it.each(['in_process', 'pending'] as const)(
      'mantém Payment em PENDING com gatewayPaymentId e transiciona Sale para PENDING quando gateway responde %s',
      async (gatewayStatus) => {
        prisma.sale.findUnique.mockResolvedValue(baseSale);
        const createdPayment = {
          id: 'pay-3',
          saleId: 'sale-1',
          method: PaymentMethod.CARD,
          status: PaymentStatus.PENDING,
          amountCents: 3580,
          gatewayPaymentId: null,
        };
        prisma.payment.create.mockResolvedValue(createdPayment);
        gateway.createCardPayment.mockResolvedValue({
          id: 'mp-3001',
          status: gatewayStatus,
          transactionAmount: 35.8,
          externalReference: 'sale-1',
        });

        const updatedPayment = {
          ...createdPayment,
          gatewayPaymentId: 'mp-3001',
        };
        const updatedSale = {
          id: baseSale.id,
          number: baseSale.number,
          operatorId: baseSale.operatorId,
          status: SaleStatus.PENDING,
          totalCents: baseSale.totalCents,
          createdAt: baseSale.createdAt,
          completedAt: null,
        };
        prisma.payment.update.mockResolvedValue(updatedPayment);
        prisma.sale.update.mockResolvedValue(updatedSale);

        const result = await service.payWithCard('sale-1', baseDto, 'op-1');

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.payment.update).toHaveBeenCalledWith({
          where: { id: 'pay-3' },
          data: {
            gatewayPaymentId: 'mp-3001',
          },
        });
        expect(prisma.sale.update).toHaveBeenCalledWith({
          where: { id: 'sale-1' },
          data: {
            status: SaleStatus.PENDING,
          },
        });
        expect(result).toEqual({
          payment: updatedPayment,
          sale: updatedSale,
        });
      },
    );

    it('rejeita com NotFoundException quando a venda não existe', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      const error = await service
        .payWithCard('sale-inexistente', baseDto, 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(gateway.createCardPayment).not.toHaveBeenCalled();
    });

    it('rejeita com ForbiddenException quando outro operador tenta cobrar a venda', async () => {
      prisma.sale.findUnique.mockResolvedValue(baseSale);

      const error = await service
        .payWithCard('sale-1', baseDto, 'op-2')
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(gateway.createCardPayment).not.toHaveBeenCalled();
    });

    it.each([SaleStatus.COMPLETED, SaleStatus.PENDING, SaleStatus.CANCELED])(
      'rejeita com UnprocessableEntityException quando a venda está em %s',
      async (status) => {
        prisma.sale.findUnique.mockResolvedValue({ ...baseSale, status });

        const error = await service
          .payWithCard('sale-1', baseDto, 'op-1')
          .catch((e) => e);

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(prisma.payment.create).not.toHaveBeenCalled();
        expect(gateway.createCardPayment).not.toHaveBeenCalled();
      },
    );
  });

  describe('payWithPix', () => {
    it('cria Payment PIX PENDING antes do gateway, envia valor do banco, externalReference e idempotencyKey, grava gatewayPaymentId e qrCode/qrCodeBase64 e transiciona Sale para PENDING', async () => {
      prisma.sale.findUnique.mockResolvedValue(baseSale);

      const createdPayment = {
        id: 'pay-pix-1',
        saleId: 'sale-1',
        method: PaymentMethod.PIX,
        status: PaymentStatus.PENDING,
        amountCents: 3580,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: new Date('2026-11-24T12:05:00.000Z'),
      };

      const callOrder: string[] = [];
      prisma.payment.create.mockImplementation(async () => {
        callOrder.push('payment.create');
        return createdPayment;
      });
      gateway.createPixPayment.mockImplementation(async () => {
        callOrder.push('gateway.createPixPayment');
        return {
          id: 'mp-pix-1001',
          status: 'pending',
          transactionAmount: 35.8,
          externalReference: 'sale-1',
          qrCode: '00020126580014br.gov.bcb.pix0136fake-qr',
          qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        };
      });

      const updatedPayment = {
        ...createdPayment,
        gatewayPaymentId: 'mp-pix-1001',
        qrCode: '00020126580014br.gov.bcb.pix0136fake-qr',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
      };
      const updatedSale = {
        id: baseSale.id,
        number: baseSale.number,
        operatorId: baseSale.operatorId,
        status: SaleStatus.PENDING,
        totalCents: baseSale.totalCents,
        createdAt: baseSale.createdAt,
        completedAt: null,
      };
      prisma.payment.update.mockResolvedValue(updatedPayment);
      prisma.sale.update.mockResolvedValue(updatedSale);

      const result = await service.payWithPix('sale-1', 'op-1');

      expect(callOrder).toEqual(['payment.create', 'gateway.createPixPayment']);
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-1',
          method: PaymentMethod.PIX,
          status: PaymentStatus.PENDING,
          amountCents: 3580,
        },
      });
      expect(gateway.createPixPayment).toHaveBeenCalledWith({
        transactionAmount: 35.8,
        payerEmail: 'operador@bleep.local',
        externalReference: 'sale-1',
        idempotencyKey: 'pay-pix-1',
        description: 'Venda #10',
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-pix-1' },
        data: {
          gatewayPaymentId: 'mp-pix-1001',
          qrCode: '00020126580014br.gov.bcb.pix0136fake-qr',
          qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        },
      });
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        data: {
          status: SaleStatus.PENDING,
        },
      });
      expect(result).toEqual({
        payment: updatedPayment,
        sale: updatedSale,
      });
      expect(result.sale.status).not.toBe(SaleStatus.COMPLETED);
      expect(result.sale.completedAt).toBeNull();
    });

    it('rejeita com NotFoundException quando a venda não existe', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      const error = await service
        .payWithPix('sale-inexistente', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(gateway.createPixPayment).not.toHaveBeenCalled();
    });

    it('rejeita com ForbiddenException quando outro operador tenta gerar PIX da venda', async () => {
      prisma.sale.findUnique.mockResolvedValue(baseSale);

      const error = await service
        .payWithPix('sale-1', 'op-2')
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(gateway.createPixPayment).not.toHaveBeenCalled();
    });

    it.each([SaleStatus.COMPLETED, SaleStatus.PENDING, SaleStatus.CANCELED])(
      'rejeita com UnprocessableEntityException quando a venda está em %s',
      async (status) => {
        prisma.sale.findUnique.mockResolvedValue({ ...baseSale, status });

        const error = await service
          .payWithPix('sale-1', 'op-1')
          .catch((e) => e);

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(prisma.payment.create).not.toHaveBeenCalled();
        expect(gateway.createPixPayment).not.toHaveBeenCalled();
      },
    );
  });

  describe('payWithCustomerCredit', () => {
    const saleWithCustomer = {
      ...baseSale,
      customerId: 'cust-1',
    };

    it('debita saldo via updateMany condicional, cria Payment(CUSTOMER_CREDIT, APPROVED), CreditTransaction(SALE_DEBIT), conclui Sale(COMPLETED) e retorna novo saldo', async () => {
      prisma.sale.findUnique.mockResolvedValue(saleWithCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });

      const createdPayment = {
        id: 'pay-credit-1',
        saleId: 'sale-1',
        method: PaymentMethod.CUSTOMER_CREDIT,
        status: PaymentStatus.APPROVED,
        amountCents: 3580,
        gatewayPaymentId: null,
        qrCode: null,
        qrCodeBase64: null,
        createdAt: new Date('2026-11-24T12:10:00.000Z'),
      };
      prisma.payment.create.mockResolvedValue(createdPayment);
      prisma.creditTransaction.create.mockResolvedValue({
        id: 'ct-1',
        customerId: 'cust-1',
        saleId: 'sale-1',
        type: CreditType.SALE_DEBIT,
        amountCents: 3580,
      });
      prisma.customer.findUniqueOrThrow.mockResolvedValue({
        id: 'cust-1',
        name: 'Maria',
        cpf: '12345678901',
        balanceCents: 1420,
      });
      const updatedSale = {
        ...saleWithCustomer,
        status: SaleStatus.COMPLETED,
        completedAt: new Date('2026-11-24T12:10:01.000Z'),
        items: [],
        payments: [createdPayment],
        customer: {
          id: 'cust-1',
          name: 'Maria',
          cpf: '12345678901',
          balanceCents: 1420,
        },
      };
      prisma.sale.findUniqueOrThrow.mockResolvedValue(updatedSale);

      const result = await service.payWithCustomerCredit('sale-1', 'op-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.customer.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'cust-1',
          balanceCents: { gte: 3580 },
        },
        data: {
          balanceCents: { decrement: 3580 },
        },
      });
      expect(prisma.sale.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sale-1',
          status: SaleStatus.OPEN,
        },
        data: {
          status: SaleStatus.COMPLETED,
          completedAt: expect.any(Date),
        },
      });
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-1',
          method: PaymentMethod.CUSTOMER_CREDIT,
          status: PaymentStatus.APPROVED,
          amountCents: 3580,
        },
      });
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          saleId: 'sale-1',
          type: CreditType.SALE_DEBIT,
          amountCents: 3580,
        },
      });
      expect(prisma.sale.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
        },
      });
      expect(result).toEqual({
        sale: updatedSale,
        payment: createdPayment,
        customerBalanceCents: 1420,
      });
    });

    it('rejeita com UnprocessableEntityException("Saldo insuficiente.") quando updateMany condicional retorna count 0', async () => {
      prisma.sale.findUnique.mockResolvedValue(saleWithCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 0 });

      const error = await service
        .payWithCustomerCredit('sale-1', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'Saldo insuficiente.',
      );
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('rejeita com UnprocessableEntityException("Selecione um cliente para pagar com crédito.") quando a venda não tem customerId', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        ...baseSale,
        customerId: null,
      });

      const error = await service
        .payWithCustomerCredit('sale-1', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'Selecione um cliente para pagar com crédito.',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita com NotFoundException quando a venda não existe', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      const error = await service
        .payWithCustomerCredit('sale-inexistente', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita com ForbiddenException quando outro operador tenta cobrar a venda', async () => {
      prisma.sale.findUnique.mockResolvedValue(saleWithCustomer);

      const error = await service
        .payWithCustomerCredit('sale-1', 'op-2')
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([SaleStatus.COMPLETED, SaleStatus.PENDING, SaleStatus.CANCELED])(
      'rejeita com UnprocessableEntityException quando a venda está em %s',
      async (status) => {
        prisma.sale.findUnique.mockResolvedValue({
          ...saleWithCustomer,
          status,
        });

        const error = await service
          .payWithCustomerCredit('sale-1', 'op-1')
          .catch((e) => e);

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('rejeita com UnprocessableEntityException quando venda deixa de estar OPEN dentro da transação', async () => {
      prisma.sale.findUnique.mockResolvedValue(saleWithCustomer);
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });
      prisma.sale.updateMany.mockResolvedValue({ count: 0 });

      const error = await service
        .payWithCustomerCredit('sale-1', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
    });
  });
});
