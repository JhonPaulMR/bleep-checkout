import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SaleStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SalesService } from './sales.service.js';

describe('SalesService', () => {
  let prisma: {
    product: {
      findMany: ReturnType<typeof vi.fn>;
    };
    sale: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: SalesService;

  beforeEach(() => {
    prisma = {
      product: {
        findMany: vi.fn(),
      },
      sale: {
        create: vi.fn(),
        findUnique: vi.fn(),
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
});
