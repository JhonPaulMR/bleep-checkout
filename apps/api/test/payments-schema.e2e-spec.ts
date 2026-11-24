import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentMethod,
  PaymentStatus,
  Role,
  SaleStatus,
} from '../generated/prisma/client.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Schema de vendas e pagamentos (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  const createdPaymentIds: string[] = [];
  const createdSaleItemIds: string[] = [];
  const createdSaleIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdWebhookEventIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();
  }, 30_000);

  afterEach(async () => {
    if (createdPaymentIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { id: { in: createdPaymentIds } },
      });
      createdPaymentIds.length = 0;
    }
    if (createdSaleItemIds.length > 0) {
      await prisma.saleItem.deleteMany({
        where: { id: { in: createdSaleItemIds } },
      });
      createdSaleItemIds.length = 0;
    }
    if (createdSaleIds.length > 0) {
      await prisma.sale.deleteMany({
        where: { id: { in: createdSaleIds } },
      });
      createdSaleIds.length = 0;
    }
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      createdProductIds.length = 0;
    }
    if (createdWebhookEventIds.length > 0) {
      await prisma.webhookEvent.deleteMany({
        where: { id: { in: createdWebhookEventIds } },
      });
      createdWebhookEventIds.length = 0;
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  async function createTestOperator() {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: 'Operador Schema Teste',
        email: `schema.op.${suffix}@teste.local`,
        passwordHash: 'hash-teste',
        role: Role.OPERATOR,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function createTestProduct(priceCents = 1590) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 12);
    const product = await prisma.product.create({
      data: {
        name: `Produto ${suffix}`,
        barcode: `789${suffix}`,
        priceCents,
      },
    });
    createdProductIds.push(product.id);
    return product;
  }

  it('cria Product, Sale, SaleItem, Payment e WebhookEvent com relacionamentos e padrões esperados', async () => {
    const operator = await createTestOperator();
    const product = await createTestProduct(2550);

    const sale = await prisma.sale.create({
      data: {
        operatorId: operator.id,
        totalCents: 5100,
      },
    });
    createdSaleIds.push(sale.id);

    expect(sale.status).toBe(SaleStatus.OPEN);
    expect(sale.number).toEqual(expect.any(Number));
    expect(sale.completedAt).toBeNull();
    expect(product.active).toBe(true);

    const item = await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        productId: product.id,
        quantity: 2,
        unitPriceCents: product.priceCents,
      },
    });
    createdSaleItemIds.push(item.id);

    const gatewayPaymentId = `mp-pay-${randomUUID()}`;
    const payment = await prisma.payment.create({
      data: {
        saleId: sale.id,
        method: PaymentMethod.PIX,
        status: PaymentStatus.PENDING,
        amountCents: sale.totalCents,
        gatewayPaymentId,
        qrCode: '00020126580014br.gov.bcb.pix',
        qrCodeBase64: 'iVBORw0KGgo=',
      },
    });
    createdPaymentIds.push(payment.id);

    const gatewayEventId = `mp-evt-${randomUUID()}`;
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        gatewayEventId,
        payload: { type: 'payment', data: { id: gatewayPaymentId } },
      },
    });
    createdWebhookEventIds.push(webhookEvent.id);

    const loadedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { items: true, payments: true },
    });

    expect(loadedSale.items).toHaveLength(1);
    expect(loadedSale.items[0].unitPriceCents).toBe(2550);
    expect(loadedSale.payments).toHaveLength(1);
    expect(loadedSale.payments[0].method).toBe(PaymentMethod.PIX);
    expect(loadedSale.payments[0].status).toBe(PaymentStatus.PENDING);
    expect(loadedSale.payments[0].gatewayPaymentId).toBe(gatewayPaymentId);
    expect(webhookEvent.processedAt).toBeInstanceOf(Date);
  });

  it('rejeita Payment.gatewayPaymentId duplicado com erro P2002', async () => {
    const operator = await createTestOperator();
    const sale = await prisma.sale.create({
      data: {
        operatorId: operator.id,
        totalCents: 1000,
      },
    });
    createdSaleIds.push(sale.id);

    const duplicatedGatewayPaymentId = `mp-dup-pay-${randomUUID()}`;
    const first = await prisma.payment.create({
      data: {
        saleId: sale.id,
        method: PaymentMethod.CARD,
        status: PaymentStatus.APPROVED,
        amountCents: 1000,
        gatewayPaymentId: duplicatedGatewayPaymentId,
      },
    });
    createdPaymentIds.push(first.id);

    await expect(
      prisma.payment.create({
        data: {
          saleId: sale.id,
          method: PaymentMethod.CARD,
          status: PaymentStatus.APPROVED,
          amountCents: 1000,
          gatewayPaymentId: duplicatedGatewayPaymentId,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejeita WebhookEvent.gatewayEventId duplicado com erro P2002', async () => {
    const duplicatedEventId = `mp-dup-evt-${randomUUID()}`;
    const first = await prisma.webhookEvent.create({
      data: {
        gatewayEventId: duplicatedEventId,
        payload: { id: duplicatedEventId },
      },
    });
    createdWebhookEventIds.push(first.id);

    await expect(
      prisma.webhookEvent.create({
        data: {
          gatewayEventId: duplicatedEventId,
          payload: { id: duplicatedEventId },
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejeita SaleItem duplicado para o mesmo (saleId, productId) com erro P2002', async () => {
    const operator = await createTestOperator();
    const product = await createTestProduct(990);
    const sale = await prisma.sale.create({
      data: {
        operatorId: operator.id,
        totalCents: 990,
      },
    });
    createdSaleIds.push(sale.id);

    const first = await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        productId: product.id,
        quantity: 1,
        unitPriceCents: product.priceCents,
      },
    });
    createdSaleItemIds.push(first.id);

    await expect(
      prisma.saleItem.create({
        data: {
          saleId: sale.id,
          productId: product.id,
          quantity: 2,
          unitPriceCents: product.priceCents,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejeita Product.barcode duplicado com erro P2002', async () => {
    const product = await createTestProduct(1200);

    await expect(
      prisma.product.create({
        data: {
          name: 'Produto Duplicado',
          barcode: product.barcode,
          priceCents: 1200,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
