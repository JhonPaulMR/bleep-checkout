import 'dotenv/config';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import {
  CreditType,
  PaymentMethod,
  PaymentStatus,
  Role,
  SaleStatus,
} from '../generated/prisma/enums.js';
import { AppModule } from '../src/app.module.js';
import {
  PAYMENT_GATEWAY,
  type CreateCardPaymentInput,
  type CreatePixPaymentInput,
  type GatewayPaymentResult,
  type PaymentGateway,
} from '../src/modules/payments/payment-gateway.interface.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Pagamentos — /payments/config, /sales/:id/payments/card e /sales/:id/payments/pix (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  const createdSaleIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdUserIds: string[] = [];

  const createCardPaymentMock =
    vi.fn<(input: CreateCardPaymentInput) => Promise<GatewayPaymentResult>>();
  const createPixPaymentMock =
    vi.fn<(input: CreatePixPaymentInput) => Promise<GatewayPaymentResult>>();
  const getPaymentMock = vi.fn();

  const fakeGateway: PaymentGateway = {
    createCardPayment: (input) => createCardPaymentMock(input),
    createPixPayment: (input) => createPixPaymentMock(input),
    getPayment: (id) => getPaymentMock(id),
  };

  const signToken = (role: Role) =>
    jwt.signAsync({ sub: randomUUID(), role });

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.data.accessToken as string;
  };

  async function createTestProduct(priceCents = 1500) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
    const product = await prisma.product.create({
      data: {
        name: `Produto Pagamento ${suffix}`,
        barcode: `789${suffix}`,
        priceCents,
        active: true,
      },
    });
    createdProductIds.push(product.id);
    return product;
  }

  async function createTestOperator() {
    const suffix = randomUUID();
    const email = `operador.pagamento.${suffix}@teste.local`;
    const password = 'Senha@123';
    const user = await prisma.user.create({
      data: {
        name: 'Outro Operador Pagamento',
        email,
        passwordHash: await argon2.hash(password),
        role: Role.OPERATOR,
      },
    });
    createdUserIds.push(user.id);
    return { user, email, password };
  }

  async function createTestCustomer(balanceCents = 10000) {
    const cpf = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-11);
    const customer = await prisma.customer.create({
      data: {
        name: `Cliente Pagamento ${cpf}`,
        cpf,
        balanceCents,
      },
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  async function createOpenSale(
    operatorToken: string,
    priceCents = 2590,
    customerId?: string,
  ) {
    const product = await createTestProduct(priceCents);
    const response = await request(app.getHttpServer())
      .post('/sales')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        items: [{ productId: product.id, quantity: 2 }],
        ...(customerId ? { customerId } : {}),
      })
      .expect(201);
    const sale = response.body.data as {
      id: string;
      totalCents: number;
      status: SaleStatus;
    };
    createdSaleIds.push(sale.id);
    return sale;
  }

  const validCardBody = {
    token: 'card-token-sandbox-001',
    paymentMethodId: 'master',
    installments: 1,
    identification: {
      type: 'CPF',
      number: '19119119100',
    },
  };

  beforeAll(async () => {
    execSync('npx prisma db seed', { stdio: 'pipe' });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_GATEWAY)
      .useValue(fakeGateway)
      .compile();
    app = moduleRef.createNestApplication();
    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);
    await app.init();
  }, 60_000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (createdSaleIds.length > 0) {
      await prisma.creditTransaction.deleteMany({
        where: { saleId: { in: createdSaleIds } },
      });
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
    if (createdCustomerIds.length > 0) {
      await prisma.creditTransaction.deleteMany({
        where: { customerId: { in: createdCustomerIds } },
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } },
      });
      createdCustomerIds.length = 0;
    }
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      createdProductIds.length = 0;
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

  describe('GET /payments/config', () => {
    it('devolve 200 apenas com publicKey para OPERATOR autenticado, sem expor segredos', async () => {
      const operatorToken = await signToken(Role.OPERATOR);

      const response = await request(app.getHttpServer())
        .get('/payments/config')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        publicKey: process.env.MP_PUBLIC_KEY,
      });
      expect(Object.keys(response.body.data)).toEqual(['publicKey']);

      const rawBody = JSON.stringify(response.body);
      expect(rawBody).not.toContain(process.env.MP_ACCESS_TOKEN!);
      expect(rawBody).not.toContain(process.env.MP_WEBHOOK_SECRET!);
    });

    it('devolve 401 sem token JWT', async () => {
      await request(app.getHttpServer()).get('/payments/config').expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await signToken(Role.MANAGER);

      await request(app.getHttpServer())
        .get('/payments/config')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });
  });

  describe('POST /sales/:id/payments/card', () => {
    it('aprova pagamento com cartão: envia valor do banco, external_reference e idempotencyKey, e conclui Sale em COMPLETED', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 2590);
      const gatewayPaymentId = `mp-approved-${randomUUID()}`;

      createCardPaymentMock.mockResolvedValue({
        id: gatewayPaymentId,
        status: 'approved',
        transactionAmount: sale.totalCents / 100,
        externalReference: sale.id,
      });

      const response = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/card`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(validCardBody)
        .expect(201);

      const { payment, sale: updatedSale } = response.body.data;

      expect(payment.method).toBe(PaymentMethod.CARD);
      expect(payment.status).toBe(PaymentStatus.APPROVED);
      expect(payment.amountCents).toBe(5180);
      expect(payment.gatewayPaymentId).toBe(gatewayPaymentId);

      expect(updatedSale.status).toBe(SaleStatus.COMPLETED);
      expect(updatedSale.completedAt).toBeTruthy();

      expect(createCardPaymentMock).toHaveBeenCalledTimes(1);
      expect(createCardPaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionAmount: 51.8,
          externalReference: sale.id,
          idempotencyKey: payment.id,
          payerEmail: process.env.SEED_OPERATOR_EMAIL,
        }),
      );

      const saleInDb = await prisma.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { payments: true },
      });
      expect(saleInDb.status).toBe(SaleStatus.COMPLETED);
      expect(saleInDb.completedAt).toBeInstanceOf(Date);
      expect(saleInDb.payments).toHaveLength(1);
      expect(saleInDb.payments[0].status).toBe(PaymentStatus.APPROVED);
      expect(saleInDb.payments[0].gatewayPaymentId).toBe(gatewayPaymentId);
    });

    it('recusa pagamento (rejected): marca Payment como DECLINED, mantém Sale em OPEN e permite nova tentativa com nova idempotencyKey', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 1000);
      const rejectedGatewayId = `mp-rejected-${randomUUID()}`;
      const approvedGatewayId = `mp-approved-${randomUUID()}`;

      createCardPaymentMock
        .mockResolvedValueOnce({
          id: rejectedGatewayId,
          status: 'rejected',
          transactionAmount: 20,
          externalReference: sale.id,
        })
        .mockResolvedValueOnce({
          id: approvedGatewayId,
          status: 'approved',
          transactionAmount: 20,
          externalReference: sale.id,
        });

      const firstResponse = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/card`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(validCardBody)
        .expect(201);

      expect(firstResponse.body.data.payment.status).toBe(
        PaymentStatus.DECLINED,
      );
      expect(firstResponse.body.data.payment.gatewayPaymentId).toBe(
        rejectedGatewayId,
      );
      expect(firstResponse.body.data.sale.status).toBe(SaleStatus.OPEN);
      expect(firstResponse.body.data.sale.completedAt).toBeNull();

      const secondResponse = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/card`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ ...validCardBody, token: 'card-token-sandbox-002' })
        .expect(201);

      expect(secondResponse.body.data.payment.status).toBe(
        PaymentStatus.APPROVED,
      );
      expect(secondResponse.body.data.sale.status).toBe(SaleStatus.COMPLETED);

      const firstKey = createCardPaymentMock.mock.calls[0][0].idempotencyKey;
      const secondKey = createCardPaymentMock.mock.calls[1][0].idempotencyKey;
      expect(firstKey).toBe(firstResponse.body.data.payment.id);
      expect(secondKey).toBe(secondResponse.body.data.payment.id);
      expect(secondKey).not.toBe(firstKey);
    });

    it.each(['in_process', 'pending'] as const)(
      'mantém Payment em PENDING e transiciona Sale para PENDING quando gateway responde %s',
      async (gatewayStatus) => {
        const operatorToken = await login(
          process.env.SEED_OPERATOR_EMAIL!,
          process.env.SEED_OPERATOR_PASSWORD!,
        );
        const sale = await createOpenSale(operatorToken, 1200);
        const pendingGatewayId = `mp-${gatewayStatus}-${randomUUID()}`;

        createCardPaymentMock.mockResolvedValue({
          id: pendingGatewayId,
          status: gatewayStatus,
          transactionAmount: 24,
          externalReference: sale.id,
        });

        const response = await request(app.getHttpServer())
          .post(`/sales/${sale.id}/payments/card`)
          .set('Authorization', `Bearer ${operatorToken}`)
          .send(validCardBody)
          .expect(201);

        expect(response.body.data.payment.status).toBe(PaymentStatus.PENDING);
        expect(response.body.data.payment.gatewayPaymentId).toBe(
          pendingGatewayId,
        );
        expect(response.body.data.sale.status).toBe(SaleStatus.PENDING);
        expect(response.body.data.sale.completedAt).toBeNull();
      },
    );

    it.each([
      ['transaction_amount', { transaction_amount: 0.01 }],
      ['amount', { amount: 1 }],
      ['amountCents', { amountCents: 1 }],
      ['totalCents', { totalCents: 1 }],
    ])(
      'rejeita com 400 quando o cliente tenta enviar campo de valor monetário (%s)',
      async (_label, extraField) => {
        const operatorToken = await login(
          process.env.SEED_OPERATOR_EMAIL!,
          process.env.SEED_OPERATOR_PASSWORD!,
        );
        const sale = await createOpenSale(operatorToken, 1000);

        await request(app.getHttpServer())
          .post(`/sales/${sale.id}/payments/card`)
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ ...validCardBody, ...extraField })
          .expect(400);

        expect(createCardPaymentMock).not.toHaveBeenCalled();
      },
    );

    it('rejeita com 422 ao tentar cobrar venda que não está em OPEN', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 1000);

      createCardPaymentMock.mockResolvedValue({
        id: `mp-pending-${randomUUID()}`,
        status: 'in_process',
        transactionAmount: 20,
        externalReference: sale.id,
      });

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/card`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(validCardBody)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/card`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(validCardBody)
        .expect(422);
    });

    it('devolve 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/card`)
        .send(validCardBody)
        .expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/card`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(validCardBody)
        .expect(403);
    });

    it('devolve 403 quando outro OPERATOR tenta cobrar a venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 1000);

      const otherOp = await createTestOperator();
      const otherToken = await login(otherOp.email, otherOp.password);

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/card`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(validCardBody)
        .expect(403);

      expect(createCardPaymentMock).not.toHaveBeenCalled();
    });

    it('devolve 404 para venda inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/card`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(validCardBody)
        .expect(404);

      expect(response.body.message).toBe('Venda não encontrada.');
    });
  });

  describe('POST /sales/:id/payments/pix', () => {
    it('gera cobrança PIX com QR Code, envia valor do banco, external_reference e idempotencyKey, e transiciona Sale para PENDING (nunca COMPLETED)', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 1990);
      const gatewayPaymentId = `mp-pix-${randomUUID()}`;
      const qrCode =
        '00020126580014br.gov.bcb.pix0136pix-bleep-checkout-sandbox-123';
      const qrCodeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC';

      createPixPaymentMock.mockResolvedValue({
        id: gatewayPaymentId,
        status: 'pending',
        transactionAmount: sale.totalCents / 100,
        externalReference: sale.id,
        qrCode,
        qrCodeBase64,
      });

      const response = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/pix`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(201);

      const { payment, sale: updatedSale } = response.body.data;

      expect(payment.method).toBe(PaymentMethod.PIX);
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.amountCents).toBe(3980);
      expect(payment.gatewayPaymentId).toBe(gatewayPaymentId);
      expect(payment.qrCode).toBe(qrCode);
      expect(payment.qrCodeBase64).toBe(qrCodeBase64);

      expect(updatedSale.status).toBe(SaleStatus.PENDING);
      expect(updatedSale.status).not.toBe(SaleStatus.COMPLETED);
      expect(updatedSale.completedAt).toBeNull();

      expect(createPixPaymentMock).toHaveBeenCalledTimes(1);
      expect(createPixPaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionAmount: 39.8,
          externalReference: sale.id,
          idempotencyKey: payment.id,
          payerEmail: process.env.SEED_OPERATOR_EMAIL,
        }),
      );

      const saleInDb = await prisma.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { payments: true },
      });
      expect(saleInDb.status).toBe(SaleStatus.PENDING);
      expect(saleInDb.completedAt).toBeNull();
      expect(saleInDb.payments).toHaveLength(1);
      expect(saleInDb.payments[0].method).toBe(PaymentMethod.PIX);
      expect(saleInDb.payments[0].status).toBe(PaymentStatus.PENDING);
      expect(saleInDb.payments[0].gatewayPaymentId).toBe(gatewayPaymentId);
      expect(saleInDb.payments[0].qrCode).toBe(qrCode);
      expect(saleInDb.payments[0].qrCodeBase64).toBe(qrCodeBase64);
    });

    it('devolve 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/pix`)
        .expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/pix`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('devolve 403 quando outro OPERATOR tenta gerar PIX da venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 1000);

      const otherOp = await createTestOperator();
      const otherToken = await login(otherOp.email, otherOp.password);

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/pix`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(createPixPaymentMock).not.toHaveBeenCalled();
    });

    it('devolve 404 para venda inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/pix`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(404);

      expect(response.body.message).toBe('Venda não encontrada.');
    });

    it('devolve 422 ao tentar gerar PIX para venda que não está em OPEN', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 1000);

      createPixPaymentMock.mockResolvedValue({
        id: `mp-pix-${randomUUID()}`,
        status: 'pending',
        transactionAmount: 20,
        externalReference: sale.id,
        qrCode: 'qr-1',
        qrCodeBase64: 'b64-1',
      });

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/pix`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/pix`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(422);
    });
  });

  describe('POST /sales/:id/payments/credit', () => {
    it('devolve 201 quando balanceCents >= totalCents, conclui venda (COMPLETED), grava Payment(CUSTOMER_CREDIT, APPROVED), CreditTransaction(SALE_DEBIT) e reduz Customer.balanceCents', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const customer = await createTestCustomer(10000);
      const sale = await createOpenSale(operatorToken, 2590, customer.id);

      const response = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/credit`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(201);

      expect(response.body.data.sale.status).toBe(SaleStatus.COMPLETED);
      expect(response.body.data.sale.completedAt).toBeTruthy();
      expect(response.body.data.payment.method).toBe(
        PaymentMethod.CUSTOMER_CREDIT,
      );
      expect(response.body.data.payment.status).toBe(PaymentStatus.APPROVED);
      expect(response.body.data.payment.amountCents).toBe(5180);
      expect(response.body.data.customerBalanceCents).toBe(4820);

      const customerInDb = await prisma.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerInDb.balanceCents).toBe(4820);

      const creditTx = await prisma.creditTransaction.findFirst({
        where: { customerId: customer.id, saleId: sale.id },
      });
      expect(creditTx).toMatchObject({
        customerId: customer.id,
        saleId: sale.id,
        type: CreditType.SALE_DEBIT,
        amountCents: 5180,
      });
    });

    it('permite pagamento quando balanceCents é exatamente igual a totalCents (saldo final 0)', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const customer = await createTestCustomer(3000);
      const sale = await createOpenSale(operatorToken, 1500, customer.id);

      const response = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/credit`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(201);

      expect(response.body.data.customerBalanceCents).toBe(0);
      expect(response.body.data.sale.status).toBe(SaleStatus.COMPLETED);

      const customerInDb = await prisma.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerInDb.balanceCents).toBe(0);
    });

    it('devolve 422 ("Saldo insuficiente.") quando balanceCents < totalCents sem alterar saldo nem concluir venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const customer = await createTestCustomer(2000);
      const sale = await createOpenSale(operatorToken, 1500, customer.id);

      const response = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/credit`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(422);

      expect(response.body.message).toBe('Saldo insuficiente.');

      const customerInDb = await prisma.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerInDb.balanceCents).toBe(2000);

      const saleInDb = await prisma.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { payments: true },
      });
      expect(saleInDb.status).toBe(SaleStatus.OPEN);
      expect(saleInDb.payments).toHaveLength(0);
    });

    it('devolve 422 ("Selecione um cliente para pagar com crédito.") quando a venda não tem customerId', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const sale = await createOpenSale(operatorToken, 1500);

      const response = await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/credit`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(422);

      expect(response.body.message).toBe(
        'Selecione um cliente para pagar com crédito.',
      );
    });

    it('devolve 422 quando a venda já está COMPLETED e não debita duas vezes', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const customer = await createTestCustomer(10000);
      const sale = await createOpenSale(operatorToken, 1500, customer.id);

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/credit`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/credit`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(422);

      const customerInDb = await prisma.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerInDb.balanceCents).toBe(7000);
    });

    it('devolve 401 sem token JWT', async () => {
      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/credit`)
        .expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/credit`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('devolve 403 quando outro OPERATOR tenta pagar a venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const customer = await createTestCustomer(10000);
      const sale = await createOpenSale(operatorToken, 1500, customer.id);

      const otherOp = await createTestOperator();
      const otherToken = await login(otherOp.email, otherOp.password);

      await request(app.getHttpServer())
        .post(`/sales/${sale.id}/payments/credit`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      const customerInDb = await prisma.customer.findUniqueOrThrow({
        where: { id: customer.id },
      });
      expect(customerInDb.balanceCents).toBe(10000);
    });

    it('devolve 404 para venda inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post(`/sales/${randomUUID()}/payments/credit`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(404);

      expect(response.body.message).toBe('Venda não encontrada.');
    });
  });
});
