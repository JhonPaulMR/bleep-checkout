import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentStatus, SaleStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SalesService } from './sales.service.js';

describe('SalesService', () => {
  let prisma: {
    product: {
      findMany: ReturnType<typeof vi.fn>;
    };
    customer: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    sale: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    payment: {
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: SalesService;

  beforeEach(() => {
    prisma = {
      product: {
        findMany: vi.fn(),
      },
      customer: {
        findUnique: vi.fn(),
      },
      sale: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateMany: vi.fn(),
      },
      payment: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    service = new SalesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('calcula totalCents a partir de Product.priceCents no banco e cria Sale OPEN com SaleItems', async () => {
      const products = [
        {
          id: 'prod-1',
          name: 'Café 500g',
          barcode: '7890000000001',
          priceCents: 1850,
          active: true,
        },
        {
          id: 'prod-2',
          name: 'Leite 1L',
          barcode: '7890000000002',
          priceCents: 590,
          active: true,
        },
      ];
      prisma.product.findMany.mockResolvedValue(products);

      const createdSale = {
        id: 'sale-1',
        number: 1,
        operatorId: 'op-1',
        status: SaleStatus.OPEN,
        totalCents: 1850 * 2 + 590 * 3,
        createdAt: new Date('2026-11-24T12:00:00.000Z'),
        completedAt: null,
        items: [
          {
            id: 'item-1',
            saleId: 'sale-1',
            productId: 'prod-1',
            quantity: 2,
            unitPriceCents: 1850,
            product: products[0],
          },
          {
            id: 'item-2',
            saleId: 'sale-1',
            productId: 'prod-2',
            quantity: 3,
            unitPriceCents: 590,
            product: products[1],
          },
        ],
        payments: [],
      };
      prisma.sale.create.mockResolvedValue(createdSale);

      const result = await service.create(
        {
          items: [
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 3 },
          ],
        },
        'op-1',
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['prod-1', 'prod-2'] },
          active: true,
        },
      });
      expect(prisma.sale.create).toHaveBeenCalledWith({
        data: {
          operatorId: 'op-1',
          customerId: null,
          status: SaleStatus.OPEN,
          totalCents: 5470,
          items: {
            create: [
              { productId: 'prod-1', quantity: 2, unitPriceCents: 1850 },
              { productId: 'prod-2', quantity: 3, unitPriceCents: 590 },
            ],
          },
        },
        include: {
          items: { include: { product: true } },
          payments: { orderBy: { createdAt: 'asc' } },
          customer: true,
        },
      });
      expect(result).toEqual(createdSale);
    });

    it('consolida quantidades quando o mesmo productId aparece repetido em items', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Café 500g',
          barcode: '7890000000001',
          priceCents: 1000,
          active: true,
        },
      ]);
      prisma.sale.create.mockResolvedValue({
        id: 'sale-2',
        operatorId: 'op-1',
        status: SaleStatus.OPEN,
        totalCents: 3000,
        items: [],
        payments: [],
      });

      await service.create(
        {
          items: [
            { productId: 'prod-1', quantity: 1 },
            { productId: 'prod-1', quantity: 2 },
          ],
        },
        'op-1',
      );

      expect(prisma.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCents: 3000,
            items: {
              create: [
                { productId: 'prod-1', quantity: 3, unitPriceCents: 1000 },
              ],
            },
          }),
        }),
      );
    });

    it('rejeita lista vazia de itens com BadRequestException', async () => {
      const error = await service
        .create({ items: [] }, 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });

    it.each([0, -1, 1.5])(
      'rejeita quantidade inválida (%s) com BadRequestException',
      async (quantity) => {
        const error = await service
          .create({ items: [{ productId: 'prod-1', quantity }] }, 'op-1')
          .catch((e) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect(prisma.product.findMany).not.toHaveBeenCalled();
        expect(prisma.sale.create).not.toHaveBeenCalled();
      },
    );

    it('rejeita com UnprocessableEntityException quando algum produto não existe ou está inativo', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Café 500g',
          barcode: '7890000000001',
          priceCents: 1850,
          active: true,
        },
      ]);

      const error = await service
        .create(
          {
            items: [
              { productId: 'prod-1', quantity: 1 },
              { productId: 'prod-inativo-ou-inexistente', quantity: 1 },
            ],
          },
          'op-1',
        )
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });

    it('vincula customerId quando informado e existente', async () => {
      const customer = {
        id: 'cust-1',
        name: 'Maria Silva',
        cpf: '12345678901',
        balanceCents: 5000,
      };
      prisma.customer.findUnique.mockResolvedValue(customer);
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Café 500g',
          barcode: '7890000000001',
          priceCents: 1850,
          active: true,
        },
      ]);
      const createdSale = {
        id: 'sale-cust-1',
        number: 2,
        operatorId: 'op-1',
        customerId: 'cust-1',
        customer,
        status: SaleStatus.OPEN,
        totalCents: 1850,
        items: [],
        payments: [],
      };
      prisma.sale.create.mockResolvedValue(createdSale);

      const result = await service.create(
        {
          items: [{ productId: 'prod-1', quantity: 1 }],
          customerId: 'cust-1',
        },
        'op-1',
      );

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(prisma.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
          }),
          include: {
            items: { include: { product: true } },
            payments: { orderBy: { createdAt: 'asc' } },
            customer: true,
          },
        }),
      );
      expect(result).toEqual(createdSale);
    });

    it('rejeita com UnprocessableEntityException quando customerId não existe', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Café 500g',
          barcode: '7890000000001',
          priceCents: 1850,
          active: true,
        },
      ]);

      const error = await service
        .create(
          {
            items: [{ productId: 'prod-1', quantity: 1 }],
            customerId: 'cust-inexistente',
          },
          'op-1',
        )
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'Cliente não encontrado.',
      );
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });
  });

  describe('findByIdForOperator', () => {
    it('retorna a venda com items (e product) e payments ordenados por createdAt quando pertence ao operador', async () => {
      const sale = {
        id: 'sale-1',
        number: 1,
        operatorId: 'op-1',
        status: SaleStatus.OPEN,
        totalCents: 1850,
        items: [],
        payments: [],
      };
      prisma.sale.findUnique.mockResolvedValue(sale);

      const result = await service.findByIdForOperator('sale-1', 'op-1');

      expect(prisma.sale.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
        include: {
          items: { include: { product: true } },
          payments: { orderBy: { createdAt: 'asc' } },
          customer: true,
        },
      });
      expect(result).toEqual(sale);
    });

    it('rejeita com NotFoundException quando a venda não existe', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      const error = await service
        .findByIdForOperator('sale-inexistente', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('rejeita com ForbiddenException quando outro operador tenta consultar a venda', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-1',
        operatorId: 'op-1',
        status: SaleStatus.OPEN,
        totalCents: 1850,
        items: [],
        payments: [],
      });

      const error = await service
        .findByIdForOperator('sale-1', 'op-2')
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('cancela venda OPEN pertencente ao operador dentro de transação atômica mantendo completedAt nulo', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-open-1',
        operatorId: 'op-1',
        status: SaleStatus.OPEN,
        completedAt: null,
      });
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });
      const canceledSale = {
        id: 'sale-open-1',
        number: 10,
        operatorId: 'op-1',
        status: SaleStatus.CANCELED,
        totalCents: 1850,
        completedAt: null,
        items: [],
        payments: [],
        customer: null,
      };
      prisma.sale.findUniqueOrThrow.mockResolvedValue(canceledSale);

      const result = await service.cancel('sale-open-1', 'op-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.sale.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sale-open-1',
          status: { in: [SaleStatus.OPEN, SaleStatus.PENDING] },
        },
        data: { status: SaleStatus.CANCELED },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          saleId: 'sale-open-1',
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.ABANDONED },
      });
      expect(prisma.sale.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'sale-open-1' },
        include: {
          items: { include: { product: true } },
          payments: { orderBy: { createdAt: 'asc' } },
          customer: true,
        },
      });
      expect(result).toEqual(canceledSale);
      expect(result.completedAt).toBeNull();
    });

    it('cancela venda PENDING e marca Payment PENDING como ABANDONED na mesma transação', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-pending-1',
        operatorId: 'op-1',
        status: SaleStatus.PENDING,
        completedAt: null,
      });
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      const canceledSale = {
        id: 'sale-pending-1',
        number: 11,
        operatorId: 'op-1',
        status: SaleStatus.CANCELED,
        totalCents: 3500,
        completedAt: null,
        items: [],
        payments: [
          {
            id: 'pay-1',
            saleId: 'sale-pending-1',
            status: PaymentStatus.ABANDONED,
          },
        ],
        customer: null,
      };
      prisma.sale.findUniqueOrThrow.mockResolvedValue(canceledSale);

      const result = await service.cancel('sale-pending-1', 'op-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.sale.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sale-pending-1',
          status: { in: [SaleStatus.OPEN, SaleStatus.PENDING] },
        },
        data: { status: SaleStatus.CANCELED },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          saleId: 'sale-pending-1',
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.ABANDONED },
      });
      expect(result).toEqual(canceledSale);
    });

    it('rejeita com NotFoundException quando a venda não existe', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      const error = await service
        .cancel('sale-inexistente', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(
        'Venda não encontrada.',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita com ForbiddenException quando outro operador tenta cancelar a venda', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-1',
        operatorId: 'op-1',
        status: SaleStatus.OPEN,
      });

      const error = await service.cancel('sale-1', 'op-2').catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).message).toBe(
        'Você não tem permissão para cancelar esta venda.',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita com UnprocessableEntityException quando a venda já está COMPLETED', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-done',
        operatorId: 'op-1',
        status: SaleStatus.COMPLETED,
      });

      const error = await service.cancel('sale-done', 'op-1').catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'Uma venda concluída não pode ser cancelada.',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita com UnprocessableEntityException quando a venda já está CANCELED', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-canceled',
        operatorId: 'op-1',
        status: SaleStatus.CANCELED,
      });

      const error = await service
        .cancel('sale-canceled', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'A venda já está cancelada.',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('em corrida (updateMany.count === 0) quando a venda foi concluída simultaneamente, lança 422 de venda concluída sem abandonar pagamentos', async () => {
      prisma.sale.findUnique
        .mockResolvedValueOnce({
          id: 'sale-race-completed',
          operatorId: 'op-1',
          status: SaleStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: 'sale-race-completed',
          operatorId: 'op-1',
          status: SaleStatus.COMPLETED,
        });
      prisma.sale.updateMany.mockResolvedValue({ count: 0 });

      const error = await service
        .cancel('sale-race-completed', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'Uma venda concluída não pode ser cancelada.',
      );
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('em corrida (updateMany.count === 0) quando a venda já foi cancelada simultaneamente, lança 422 de venda já cancelada sem abandonar pagamentos', async () => {
      prisma.sale.findUnique
        .mockResolvedValueOnce({
          id: 'sale-race-canceled',
          operatorId: 'op-1',
          status: SaleStatus.OPEN,
        })
        .mockResolvedValueOnce({
          id: 'sale-race-canceled',
          operatorId: 'op-1',
          status: SaleStatus.CANCELED,
        });
      prisma.sale.updateMany.mockResolvedValue({ count: 0 });

      const error = await service
        .cancel('sale-race-canceled', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'A venda já está cancelada.',
      );
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllForOperator', () => {
    it('filtra por operatorId e status quando informado, ordenado por createdAt desc com detalhes', async () => {
      const pendingSales = [
        {
          id: 'sale-pending-2',
          number: 20,
          operatorId: 'op-1',
          status: SaleStatus.PENDING,
          totalCents: 2500,
          createdAt: new Date('2026-11-27T15:00:00.000Z'),
          items: [],
          payments: [{ id: 'pay-2', status: PaymentStatus.PENDING }],
          customer: { id: 'cust-1', name: 'Maria Silva' },
        },
      ];
      prisma.sale.findMany.mockResolvedValue(pendingSales);

      const result = await service.findAllForOperator(
        'op-1',
        SaleStatus.PENDING,
      );

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op-1',
          status: SaleStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          payments: { orderBy: { createdAt: 'asc' } },
          customer: true,
        },
      });
      expect(result).toEqual(pendingSales);
    });

    it('filtra apenas por operatorId quando status não é informado e retorna lista vazia', async () => {
      prisma.sale.findMany.mockResolvedValue([]);

      const result = await service.findAllForOperator('op-1');

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op-1',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          payments: { orderBy: { createdAt: 'asc' } },
          customer: true,
        },
      });
      expect(result).toEqual([]);
    });
  });

  describe('reopen', () => {
    it('reabre venda PENDING do operador em transação atômica, marcando Payment PENDING como ABANDONED', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-pending-1',
        operatorId: 'op-1',
        status: SaleStatus.PENDING,
        completedAt: null,
      });
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      const reopenedSale = {
        id: 'sale-pending-1',
        number: 15,
        operatorId: 'op-1',
        status: SaleStatus.OPEN,
        totalCents: 3500,
        completedAt: null,
        items: [],
        payments: [
          {
            id: 'pay-1',
            saleId: 'sale-pending-1',
            status: PaymentStatus.ABANDONED,
          },
        ],
        customer: null,
      };
      prisma.sale.findUniqueOrThrow.mockResolvedValue(reopenedSale);

      const result = await service.reopen('sale-pending-1', 'op-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.sale.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'sale-pending-1',
          status: SaleStatus.PENDING,
        },
        data: { status: SaleStatus.OPEN },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          saleId: 'sale-pending-1',
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.ABANDONED },
      });
      expect(prisma.sale.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'sale-pending-1' },
        include: {
          items: { include: { product: true } },
          payments: { orderBy: { createdAt: 'asc' } },
          customer: true,
        },
      });
      expect(result).toEqual(reopenedSale);
    });

    it('rejeita com NotFoundException quando a venda não existe', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      const error = await service
        .reopen('sale-inexistente', 'op-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe(
        'Venda não encontrada.',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita com ForbiddenException quando outro operador tenta reabrir a venda', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-pending-1',
        operatorId: 'op-1',
        status: SaleStatus.PENDING,
      });

      const error = await service
        .reopen('sale-pending-1', 'op-2')
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([SaleStatus.OPEN, SaleStatus.COMPLETED, SaleStatus.CANCELED])(
      'rejeita com UnprocessableEntityException quando a venda está em estado %s',
      async (status) => {
        prisma.sale.findUnique.mockResolvedValue({
          id: `sale-${status.toLowerCase()}`,
          operatorId: 'op-1',
          status,
        });

        const error = await service
          .reopen(`sale-${status.toLowerCase()}`, 'op-1')
          .catch((e) => e);

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect((error as UnprocessableEntityException).message).toBe(
          'A venda não está pendente para reabertura.',
        );
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('em corrida (updateMany.count === 0), lança 422 sem abandonar pagamentos', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 'sale-race',
        operatorId: 'op-1',
        status: SaleStatus.PENDING,
      });
      prisma.sale.updateMany.mockResolvedValue({ count: 0 });

      const error = await service.reopen('sale-race', 'op-1').catch((e) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).message).toBe(
        'A venda não está pendente para reabertura.',
      );
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });
});
