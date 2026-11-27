import 'dotenv/config';
import { execSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import {
  PaymentMethod,
  PaymentStatus,
  Role,
  SaleStatus,
} from '../generated/prisma/enums.js';
import { AppModule } from '../src/app.module.js';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../src/modules/payments/payment-gateway.interface.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Catálogo mínimo e vendas — /products e /sales (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const createdSaleIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdEventIds: string[] = [];

  const createCardPaymentMock = vi.fn();
  const createPixPaymentMock = vi.fn();
  const getPaymentMock = vi.fn();

  const fakeGateway: PaymentGateway = {
    createCardPayment: (input) => createCardPaymentMock(input),
    createPixPayment: (input) => createPixPaymentMock(input),
    getPayment: (id) => getPaymentMock(id),
  };

  function buildSignatureHeader(
    dataId: string,
    requestId: string,
    ts: string,
    secret = process.env.MP_WEBHOOK_SECRET!,
  ): string {
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
    return `ts=${ts},v1=${v1}`;
  }

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.data.accessToken as string;
  };

  async function createTestProduct(options?: {
    name?: string;
    priceCents?: number;
    active?: boolean;
  }) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
    const product = await prisma.product.create({
      data: {
        name: options?.name ?? `Produto Venda ${suffix}`,
        barcode: `789${suffix}`,
        priceCents: options?.priceCents ?? 1250,
        active: options?.active ?? true,
      },
    });
    createdProductIds.push(product.id);
    return product;
  }

  async function createTestOperator() {
    const suffix = randomUUID();
    const email = `operador.venda.${suffix}@teste.local`;
    const password = 'Senha@123';
    const user = await prisma.user.create({
      data: {
        name: 'Outro Operador Venda',
        email,
        passwordHash: await argon2.hash(password),
        role: Role.OPERATOR,
      },
    });
    createdUserIds.push(user.id);
    return { user, email, password };
  }

  async function createTestCustomer(balanceCents = 5000) {
    const cpf = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-11);
    const customer = await prisma.customer.create({
      data: {
        name: `Cliente Venda ${cpf}`,
        cpf,
        balanceCents,
      },
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  beforeAll(async () => {
    execSync('npx prisma db seed', { stdio: 'pipe' });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_GATEWAY)
      .useValue(fakeGateway)
      .compile();
    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  }, 60_000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (createdEventIds.length > 0) {
      await prisma.webhookEvent.deleteMany({
        where: { gatewayEventId: { in: createdEventIds.splice(0) } },
      });
    }
    if (createdSaleIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { saleId: { in: createdSaleIds } },
      });
      await prisma.saleItem.deleteMany({
        where: { saleId: { in: createdSaleIds } },
      });
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
    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } },
      });
      createdCustomerIds.length = 0;
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /products', () => {
    it('lista apenas produtos ativos para OPERATOR autenticado', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const activeProduct = await createTestProduct({
        name: 'Produto Ativo Caixa',
        priceCents: 990,
        active: true,
      });
      const inactiveProduct = await createTestProduct({
        name: 'Produto Inativo Caixa',
        priceCents: 500,
        active: false,
      });

      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      const ids = response.body.data.map((p: { id: string }) => p.id);
      expect(ids).toContain(activeProduct.id);
      expect(ids).not.toContain(inactiveProduct.id);
    });

    it('devolve 401 sem token', async () => {
      await request(app.getHttpServer()).get('/products').expect(401);
    });

    it('permite listagem de produtos para MANAGER (US01 CA4)', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });
  });

  describe('POST /sales', () => {
    it('cria venda OPEN com totalCents calculado no servidor a partir dos preços do banco e devolve 201', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prodA = await createTestProduct({ priceCents: 1500 });
      const prodB = await createTestProduct({ priceCents: 450 });

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          items: [
            { productId: prodA.id, quantity: 2 },
            { productId: prodB.id, quantity: 3 },
          ],
        })
        .expect(201);

      const sale = response.body.data;
      createdSaleIds.push(sale.id);

      expect(sale.status).toBe('OPEN');
      expect(sale.totalCents).toBe(1500 * 2 + 450 * 3);
      expect(sale.items).toHaveLength(2);
      const itemA = sale.items.find(
        (i: { productId: string }) => i.productId === prodA.id,
      );
      const itemB = sale.items.find(
        (i: { productId: string }) => i.productId === prodB.id,
      );
      expect(itemA.unitPriceCents).toBe(1500);
      expect(itemA.quantity).toBe(2);
      expect(itemB.unitPriceCents).toBe(450);
      expect(itemB.quantity).toBe(3);
    });

    it.each([
      ['totalCents na raiz', { totalCents: 1 }],
      ['priceCents na raiz', { priceCents: 1 }],
      ['transaction_amount na raiz', { transaction_amount: 0.01 }],
    ])(
      'rejeita com 400 quando o cliente tenta enviar %s',
      async (_label, extraField) => {
        const operatorToken = await login(
          process.env.SEED_OPERATOR_EMAIL!,
          process.env.SEED_OPERATOR_PASSWORD!,
        );
        const prod = await createTestProduct({ priceCents: 2000 });

        await request(app.getHttpServer())
          .post('/sales')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            items: [{ productId: prod.id, quantity: 1 }],
            ...extraField,
          })
          .expect(400);
      },
    );

    it('rejeita com 400 quando item contém campo de preço extra', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 2000 });

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          items: [{ productId: prod.id, quantity: 1, priceCents: 1 }],
        })
        .expect(400);
    });

    it('rejeita com 400 para lista de itens vazia', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [] })
        .expect(400);
    });

    it.each([
      ['zero (0)', 0],
      ['negativa (-2)', -2],
      ['decimal (1.5)', 1.5],
    ])(
      'rejeita com 400 e não cria venda no banco quando quantity é %s (CA6/RN07)',
      async (_label, quantity) => {
        const operatorToken = await login(
          process.env.SEED_OPERATOR_EMAIL!,
          process.env.SEED_OPERATOR_PASSWORD!,
        );
        const prod = await createTestProduct({ priceCents: 1000 });

        const countBefore = await prisma.sale.count();

        await request(app.getHttpServer())
          .post('/sales')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ items: [{ productId: prod.id, quantity }] })
          .expect(400);

        const countAfter = await prisma.sale.count();
        expect(countAfter).toBe(countBefore);
      },
    );

    it('rejeita com 422 para produto inativo ou inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const inactiveProduct = await createTestProduct({
        priceCents: 1000,
        active: false,
      });

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: inactiveProduct.id, quantity: 1 }] })
        .expect(422);

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: randomUUID(), quantity: 1 }] })
        .expect(422);
    });

    it('devolve 401 sem token', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .send({ items: [{ productId: randomUUID(), quantity: 1 }] })
        .expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1000 });

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(403);
    });

    it('vincula customerId válido na venda e devolve customer no payload (201)', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1500 });
      const customer = await createTestCustomer(4000);

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          items: [{ productId: prod.id, quantity: 2 }],
          customerId: customer.id,
        })
        .expect(201);

      createdSaleIds.push(response.body.data.id);
      expect(response.body.data.customerId).toBe(customer.id);
      expect(response.body.data.customer).toMatchObject({
        id: customer.id,
        name: customer.name,
        cpf: customer.cpf,
        balanceCents: 4000,
      });
    });

    it('devolve 422 quando customerId não existe', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1500 });

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          items: [{ productId: prod.id, quantity: 1 }],
          customerId: randomUUID(),
        })
        .expect(422);

      expect(response.body.message).toBe('Cliente não encontrado.');
    });
  });

  describe('GET /sales/:id', () => {
    it('retorna 200 com items (e product) e payments para o operador dono da venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1790 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 2 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const response = await request(app.getHttpServer())
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(saleId);
      expect(response.body.data.totalCents).toBe(3580);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].product.id).toBe(prod.id);
      expect(response.body.data.payments).toEqual([]);
    });

    it('devolve 403 quando outro OPERATOR tenta consultar a venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1000 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const otherOp = await createTestOperator();
      const otherToken = await login(otherOp.email, otherOp.password);

      await request(app.getHttpServer())
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .get(`/sales/${randomUUID()}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('devolve 404 para venda inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .get(`/sales/${randomUUID()}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(404);

      expect(response.body.message).toBe('Venda não encontrada.');
    });

    it('devolve 401 sem token', async () => {
      await request(app.getHttpServer())
        .get(`/sales/${randomUUID()}`)
        .expect(401);
    });
  });

  describe('POST /sales/:id/cancel', () => {
    it('cancela venda OPEN do operador autenticado com 201 mantendo completedAt nulo', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1850 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 2 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const response = await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(201);

      expect(response.body.data.id).toBe(saleId);
      expect(response.body.data.status).toBe(SaleStatus.CANCELED);
      expect(response.body.data.completedAt).toBeNull();
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.payments).toEqual([]);

      const persisted = await prisma.sale.findUniqueOrThrow({
        where: { id: saleId },
      });
      expect(persisted.status).toBe(SaleStatus.CANCELED);
      expect(persisted.completedAt).toBeNull();
    });

    it('cancela venda PENDING (PIX) com 201 marcando Payment PENDING como ABANDONED sem alterar pagamentos DECLINED anteriores', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 2490 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const declinedPayment = await prisma.payment.create({
        data: {
          saleId,
          method: PaymentMethod.CARD,
          status: PaymentStatus.DECLINED,
          amountCents: 2490,
        },
      });

      const gatewayPaymentId = `mp-pix-${randomUUID().slice(0, 10)}`;
      createPixPaymentMock.mockResolvedValueOnce({
        id: gatewayPaymentId,
        status: 'pending',
        qrCode: '000201pix-code',
        qrCodeBase64: 'base64-qr',
      });

      const pixResponse = await request(app.getHttpServer())
        .post(`/sales/${saleId}/payments/pix`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(201);

      const pendingPaymentId = pixResponse.body.data.payment.id as string;

      const cancelResponse = await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(201);

      expect(cancelResponse.body.data.status).toBe(SaleStatus.CANCELED);
      expect(cancelResponse.body.data.completedAt).toBeNull();

      const updatedPendingPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: pendingPaymentId },
      });
      expect(updatedPendingPayment.status).toBe(PaymentStatus.ABANDONED);

      const updatedDeclinedPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: declinedPayment.id },
      });
      expect(updatedDeclinedPayment.status).toBe(PaymentStatus.DECLINED);
    });

    it('devolve 401 sem token', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/cancel`)
        .send({})
        .expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/cancel`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({})
        .expect(403);
    });

    it('devolve 403 quando outro OPERATOR tenta cancelar a venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1000 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const otherOp = await createTestOperator();
      const otherToken = await login(otherOp.email, otherOp.password);

      await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({})
        .expect(403);

      const unchanged = await prisma.sale.findUniqueOrThrow({
        where: { id: saleId },
      });
      expect(unchanged.status).toBe(SaleStatus.OPEN);
    });

    it('devolve 404 para venda inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/cancel`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(404);

      expect(response.body.message).toBe('Venda não encontrada.');
    });

    it('recusa com 422 ao tentar cancelar venda já COMPLETED sem alterar Sale nem Payment', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1500 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const paid = await request(app.getHttpServer())
        .post(`/sales/${saleId}/payments/external`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ method: PaymentMethod.EXTERNAL_DEBIT, approved: true })
        .expect(201);

      const paymentId = paid.body.data.payment.id as string;
      const completedBefore = await prisma.sale.findUniqueOrThrow({
        where: { id: saleId },
      });

      const response = await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(422);

      expect(response.body.message).toBe(
        'Uma venda concluída não pode ser cancelada.',
      );

      const saleAfter = await prisma.sale.findUniqueOrThrow({
        where: { id: saleId },
      });
      expect(saleAfter.status).toBe(SaleStatus.COMPLETED);
      expect(saleAfter.completedAt?.toISOString()).toBe(
        completedBefore.completedAt?.toISOString(),
      );

      const paymentAfter = await prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      expect(paymentAfter.status).toBe(PaymentStatus.APPROVED);
    });

    it('recusa com 422 ao tentar cancelar venda já CANCELED sem alterar Sale nem Payment', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1200 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(201);

      const secondCancel = await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(422);

      expect(secondCancel.body.message).toBe('A venda já está cancelada.');

      const saleAfter = await prisma.sale.findUniqueOrThrow({
        where: { id: saleId },
      });
      expect(saleAfter.status).toBe(SaleStatus.CANCELED);
      expect(saleAfter.completedAt).toBeNull();
    });

    it('garante que venda CANCELED não volta a COMPLETED com pagamento posterior nem com webhook PIX atrasado approved', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 3200 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const gatewayPaymentId = `mp-pix-late-${randomUUID().slice(0, 10)}`;
      createPixPaymentMock.mockResolvedValueOnce({
        id: gatewayPaymentId,
        status: 'pending',
        qrCode: '000201pix-late',
        qrCodeBase64: 'base64-qr-late',
      });

      const pixResponse = await request(app.getHttpServer())
        .post(`/sales/${saleId}/payments/pix`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(201);

      const pixPaymentId = pixResponse.body.data.payment.id as string;

      await request(app.getHttpServer())
        .post(`/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales/${saleId}/payments/external`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ method: PaymentMethod.EXTERNAL_CREDIT, approved: true })
        .expect(422);

      const requestId = `req-${randomUUID()}`;
      createdEventIds.push(requestId);
      const ts = '1732479900';
      const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

      getPaymentMock.mockResolvedValueOnce({
        id: gatewayPaymentId,
        status: 'approved',
        transactionAmount: 32.0,
        externalReference: saleId,
      });

      await request(app.getHttpServer())
        .post('/webhooks/mercadopago')
        .query({ 'data.id': gatewayPaymentId, type: 'payment' })
        .set('x-signature', signature)
        .set('x-request-id', requestId)
        .send({
          id: 99999,
          live_mode: false,
          type: 'payment',
          date_created: '2026-11-27T18:00:00Z',
          user_id: 999999,
          api_version: 'v1',
          action: 'payment.updated',
          data: { id: gatewayPaymentId },
        })
        .expect(200);

      const persistedSale = await prisma.sale.findUniqueOrThrow({
        where: { id: saleId },
      });
      expect(persistedSale.status).toBe(SaleStatus.CANCELED);
      expect(persistedSale.completedAt).toBeNull();

      const persistedPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: pixPaymentId },
      });
      expect(persistedPayment.status).toBe(PaymentStatus.ABANDONED);
    });
  });
});
