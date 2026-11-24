import 'dotenv/config';
import { createHmac, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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

describe('Webhooks — POST /webhooks/mercadopago (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let operatorId: string;

  const createdSaleIds: string[] = [];
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

  async function createSaleWithPayment(params: {
    saleStatus: SaleStatus;
    paymentStatus: PaymentStatus;
    method?: PaymentMethod;
    totalCents?: number;
    gatewayPaymentId?: string;
    completedAt?: Date | null;
  }) {
    const totalCents = params.totalCents ?? 4590;
    const gatewayPaymentId =
      params.gatewayPaymentId ?? `mp-${randomUUID().slice(0, 12)}`;

    const sale = await prisma.sale.create({
      data: {
        operatorId,
        status: params.saleStatus,
        totalCents,
        completedAt: params.completedAt ?? null,
      },
    });
    createdSaleIds.push(sale.id);

    const payment = await prisma.payment.create({
      data: {
        saleId: sale.id,
        method: params.method ?? PaymentMethod.PIX,
        status: params.paymentStatus,
        amountCents: totalCents,
        gatewayPaymentId,
      },
    });

    return { sale, payment, gatewayPaymentId };
  }

  const sampleBody = {
    id: 12345,
    live_mode: false,
    type: 'payment',
    date_created: '2026-11-24T18:00:00Z',
    user_id: 999999,
    api_version: 'v1',
    action: 'payment.updated',
    data: { id: '987654321' },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_GATEWAY)
      .useValue(fakeGateway)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    const operator = await prisma.user.create({
      data: {
        name: 'Operador Webhook E2E',
        email: `op-webhook-${randomUUID()}@bleep.local`,
        passwordHash: 'hash-e2e',
        role: Role.OPERATOR,
      },
    });
    operatorId = operator.id;
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
      const saleIds = createdSaleIds.splice(0);
      await prisma.payment.deleteMany({ where: { saleId: { in: saleIds } } });
      await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
    }
  });

  afterAll(async () => {
    if (operatorId) {
      await prisma.user.deleteMany({ where: { id: operatorId } });
    }
    await app?.close();
  });

  it('responde 200 sem JWT (@Public) quando a assinatura HMAC-SHA256 é válida', async () => {
    const dataId = '987654321';
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732471000';
    const signature = buildSignatureHeader(dataId, requestId, ts);

    getPaymentMock.mockResolvedValue({
      id: dataId,
      status: 'pending',
      transactionAmount: 10,
      externalReference: null,
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': dataId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send(sampleBody)
      .expect(200);

    expect(response.body.data).toEqual({ received: true });
  });

  it('responde 401 quando x-signature está ausente, sem consultar o gateway nem gravar WebhookEvent', async () => {
    const beforeCount = await prisma.webhookEvent.count();

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': '987654321', type: 'payment' })
      .set('x-request-id', `req-${randomUUID()}`)
      .send(sampleBody)
      .expect(401);

    expect(getPaymentMock).not.toHaveBeenCalled();
    expect(await prisma.webhookEvent.count()).toBe(beforeCount);
  });

  it('responde 401 quando x-request-id está ausente, sem consultar o gateway nem gravar WebhookEvent', async () => {
    const beforeCount = await prisma.webhookEvent.count();
    const signature = buildSignatureHeader(
      '987654321',
      'req-missing',
      '1732471100',
    );

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': '987654321', type: 'payment' })
      .set('x-signature', signature)
      .send(sampleBody)
      .expect(401);

    expect(getPaymentMock).not.toHaveBeenCalled();
    expect(await prisma.webhookEvent.count()).toBe(beforeCount);
  });

  it('responde 401 quando data.id está ausente na query string, sem consultar o gateway nem gravar WebhookEvent', async () => {
    const beforeCount = await prisma.webhookEvent.count();
    const requestId = `req-${randomUUID()}`;
    const signature = buildSignatureHeader('987654321', requestId, '1732471200');

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send(sampleBody)
      .expect(401);

    expect(getPaymentMock).not.toHaveBeenCalled();
    expect(await prisma.webhookEvent.count()).toBe(beforeCount);
  });

  it('responde 401 quando a assinatura foi gerada com segredo errado, sem consultar o gateway nem gravar WebhookEvent', async () => {
    const beforeCount = await prisma.webhookEvent.count();
    const dataId = '987654321';
    const requestId = `req-${randomUUID()}`;
    const signature = buildSignatureHeader(
      dataId,
      requestId,
      '1732471300',
      'segredo-errado',
    );

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': dataId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send(sampleBody)
      .expect(401);

    expect(getPaymentMock).not.toHaveBeenCalled();
    expect(await prisma.webhookEvent.count()).toBe(beforeCount);
  });

  it('responde 401 quando o manifesto é adulterado (data.id diferente do assinado), sem consultar o gateway nem gravar WebhookEvent', async () => {
    const beforeCount = await prisma.webhookEvent.count();
    const requestId = `req-${randomUUID()}`;
    const signature = buildSignatureHeader('987654321', requestId, '1732471400');

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': '111111111', type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send(sampleBody)
      .expect(401);

    expect(getPaymentMock).not.toHaveBeenCalled();
    expect(await prisma.webhookEvent.count()).toBe(beforeCount);
  });

  it('responde 401 (e nunca 500) quando x-signature está malformado ou v1 tem tamanho diferente', async () => {
    const beforeCount = await prisma.webhookEvent.count();

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': '987654321', type: 'payment' })
      .set('x-signature', 'ts=1732471500,v1=deadbeef')
      .set('x-request-id', `req-${randomUUID()}`)
      .send(sampleBody)
      .expect(401);

    expect(getPaymentMock).not.toHaveBeenCalled();
    expect(await prisma.webhookEvent.count()).toBe(beforeCount);
  });

  it('conclui venda PENDING (PIX ou cartão em análise) para COMPLETED quando webhook assinado confirma approved', async () => {
    const { sale, payment, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      method: PaymentMethod.PIX,
      totalCents: 4590,
    });
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472000';
    const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

    getPaymentMock.mockResolvedValue({
      id: gatewayPaymentId,
      status: 'approved',
      transactionAmount: 45.9,
      externalReference: sale.id,
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    expect(response.body.data).toEqual({ received: true });
    expect(getPaymentMock).toHaveBeenCalledWith(gatewayPaymentId);

    const updatedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(updatedSale.status).toBe(SaleStatus.COMPLETED);
    expect(updatedSale.completedAt).toBeInstanceOf(Date);

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(updatedPayment.status).toBe(PaymentStatus.APPROVED);

    const storedEvent = await prisma.webhookEvent.findUnique({
      where: { gatewayEventId: requestId },
    });
    expect(storedEvent).not.toBeNull();
  });

  it('volta venda PENDING para OPEN e marca pagamento como DECLINED quando webhook assinado confirma rejected', async () => {
    const { sale, payment, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      totalCents: 1990,
    });
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472100';
    const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

    getPaymentMock.mockResolvedValue({
      id: gatewayPaymentId,
      status: 'rejected',
      transactionAmount: 19.9,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    const updatedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(updatedSale.status).toBe(SaleStatus.OPEN);
    expect(updatedSale.completedAt).toBeNull();

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(updatedPayment.status).toBe(PaymentStatus.DECLINED);
  });

  it('trata repetição do mesmo webhook (mesmo x-request-id) de forma idempotente respondendo 200 sem duplicar registros', async () => {
    const { sale, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 2500,
    });
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472200';
    const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

    getPaymentMock.mockResolvedValue({
      id: gatewayPaymentId,
      status: 'approved',
      transactionAmount: 25.0,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    const secondResponse = await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    expect(secondResponse.body.data).toEqual({ received: true });
    expect(getPaymentMock).toHaveBeenCalledTimes(1);

    const eventsCount = await prisma.webhookEvent.count({
      where: { gatewayEventId: requestId },
    });
    expect(eventsCount).toBe(1);

    const paymentsCount = await prisma.payment.count({
      where: { saleId: sale.id },
    });
    expect(paymentsCount).toBe(1);
  });

  it('mantém COMPLETED intacto quando chega webhook approved após aprovação síncrona (novo x-request-id)', async () => {
    const originalCompletedAt = new Date('2026-11-24T15:00:00.000Z');
    const { sale, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.COMPLETED,
      paymentStatus: PaymentStatus.APPROVED,
      method: PaymentMethod.CARD,
      totalCents: 5000,
      completedAt: originalCompletedAt,
    });
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472300';
    const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

    getPaymentMock.mockResolvedValue({
      id: gatewayPaymentId,
      status: 'approved',
      transactionAmount: 50.0,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    const updatedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(updatedSale.status).toBe(SaleStatus.COMPLETED);
    expect(updatedSale.completedAt?.toISOString()).toBe(
      originalCompletedAt.toISOString(),
    );
    expect(await prisma.payment.count({ where: { saleId: sale.id } })).toBe(1);
  });

  it('ignora notificação atrasada (pending/rejected) em venda já COMPLETED respondendo 200 sem regredir estado', async () => {
    const originalCompletedAt = new Date('2026-11-24T15:10:00.000Z');
    const { sale, payment, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.COMPLETED,
      paymentStatus: PaymentStatus.APPROVED,
      totalCents: 3000,
      completedAt: originalCompletedAt,
    });

    for (const lateStatus of ['pending', 'rejected'] as const) {
      const requestId = `req-${randomUUID()}`;
      createdEventIds.push(requestId);
      const ts = '1732472400';
      const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

      getPaymentMock.mockResolvedValueOnce({
        id: gatewayPaymentId,
        status: lateStatus,
        transactionAmount: 30.0,
        externalReference: sale.id,
      });

      await request(app.getHttpServer())
        .post('/webhooks/mercadopago')
        .query({ 'data.id': gatewayPaymentId, type: 'payment' })
        .set('x-signature', signature)
        .set('x-request-id', requestId)
        .send({ ...sampleBody, data: { id: gatewayPaymentId } })
        .expect(200);
    }

    const updatedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(updatedSale.status).toBe(SaleStatus.COMPLETED);
    expect(updatedSale.completedAt?.toISOString()).toBe(
      originalCompletedAt.toISOString(),
    );

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(updatedPayment.status).toBe(PaymentStatus.APPROVED);
  });

  it('ignora notificação approved em venda CANCELED respondendo 200 sem concluir', async () => {
    const { sale, payment, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.CANCELED,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 1500,
    });
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472500';
    const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

    getPaymentMock.mockResolvedValue({
      id: gatewayPaymentId,
      status: 'approved',
      transactionAmount: 15.0,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    const updatedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(updatedSale.status).toBe(SaleStatus.CANCELED);
    expect(updatedSale.completedAt).toBeNull();

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(updatedPayment.status).toBe(PaymentStatus.PENDING);
  });

  it('não conclui venda quando transaction_amount ou external_reference diverge do banco', async () => {
    const { sale, payment, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 8000,
    });

    const reqWrongAmount = `req-${randomUUID()}`;
    createdEventIds.push(reqWrongAmount);
    getPaymentMock.mockResolvedValueOnce({
      id: gatewayPaymentId,
      status: 'approved',
      transactionAmount: 1.0,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set(
        'x-signature',
        buildSignatureHeader(gatewayPaymentId, reqWrongAmount, '1732472600'),
      )
      .set('x-request-id', reqWrongAmount)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    const reqWrongRef = `req-${randomUUID()}`;
    createdEventIds.push(reqWrongRef);
    getPaymentMock.mockResolvedValueOnce({
      id: gatewayPaymentId,
      status: 'approved',
      transactionAmount: 80.0,
      externalReference: randomUUID(),
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set(
        'x-signature',
        buildSignatureHeader(gatewayPaymentId, reqWrongRef, '1732472601'),
      )
      .set('x-request-id', reqWrongRef)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    const unchangedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(unchangedSale.status).toBe(SaleStatus.PENDING);
    expect(unchangedSale.completedAt).toBeNull();

    const unchangedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(unchangedPayment.status).toBe(PaymentStatus.PENDING);
  });

  it('responde 500 e não grava WebhookEvent em erro transitório do gateway (503), permitindo retry posterior', async () => {
    const { sale, payment, gatewayPaymentId } = await createSaleWithPayment({
      saleStatus: SaleStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 6000,
    });
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472700';
    const signature = buildSignatureHeader(gatewayPaymentId, requestId, ts);

    getPaymentMock.mockRejectedValueOnce(
      Object.assign(new Error('Gateway timeout'), { status: 503 }),
    );

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(500);

    const eventAfterFailure = await prisma.webhookEvent.findUnique({
      where: { gatewayEventId: requestId },
    });
    expect(eventAfterFailure).toBeNull();

    // Retry com o mesmo x-request-id agora deve processar normalmente
    getPaymentMock.mockResolvedValueOnce({
      id: gatewayPaymentId,
      status: 'approved',
      transactionAmount: 60.0,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gatewayPaymentId } })
      .expect(200);

    const updatedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(updatedSale.status).toBe(SaleStatus.COMPLETED);

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(updatedPayment.status).toBe(PaymentStatus.APPROVED);
  });

  it('responde 200 sem gravar WebhookEvent quando o gateway retorna 404 (simulação 1212)', async () => {
    const requestId = `req-${randomUUID()}`;
    const ts = '1732472750';
    const signature = buildSignatureHeader('1212', requestId, ts);

    getPaymentMock.mockRejectedValueOnce({
      status: 404,
      message: 'Payment not found',
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': '1212', type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: '1212' } })
      .expect(200);

    expect(response.body.data).toEqual({ received: true });
    expect(
      await prisma.webhookEvent.findUnique({
        where: { gatewayEventId: requestId },
      }),
    ).toBeNull();
  });

  it('não regride venda PENDING (com Payment 2 PIX em PENDING) quando chega webhook atrasado rejected do Payment 1 já DECLINED', async () => {
    const { sale, payment: payment1, gatewayPaymentId: gwPay1 } =
      await createSaleWithPayment({
        saleStatus: SaleStatus.PENDING,
        paymentStatus: PaymentStatus.DECLINED,
        method: PaymentMethod.CARD,
        totalCents: 4200,
      });

    const payment2 = await prisma.payment.create({
      data: {
        saleId: sale.id,
        method: PaymentMethod.PIX,
        status: PaymentStatus.PENDING,
        amountCents: 4200,
        gatewayPaymentId: `mp-${randomUUID().slice(0, 12)}`,
      },
    });

    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472800';
    const signature = buildSignatureHeader(gwPay1, requestId, ts);

    getPaymentMock.mockResolvedValueOnce({
      id: gwPay1,
      status: 'rejected',
      transactionAmount: 42.0,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': gwPay1, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: gwPay1 } })
      .expect(200);

    const unchangedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(unchangedSale.status).toBe(SaleStatus.PENDING);

    const unchangedPay1 = await prisma.payment.findUniqueOrThrow({
      where: { id: payment1.id },
    });
    expect(unchangedPay1.status).toBe(PaymentStatus.DECLINED);

    const unchangedPay2 = await prisma.payment.findUniqueOrThrow({
      where: { id: payment2.id },
    });
    expect(unchangedPay2.status).toBe(PaymentStatus.PENDING);
  });

  it('não conclui venda quando webhook approved referencia um gatewayPaymentId sem Payment no banco', async () => {
    const { sale } = await createSaleWithPayment({
      saleStatus: SaleStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      totalCents: 3100,
    });
    const unknownGatewayPaymentId = `mp-unknown-${randomUUID().slice(0, 8)}`;
    const requestId = `req-${randomUUID()}`;
    createdEventIds.push(requestId);
    const ts = '1732472900';
    const signature = buildSignatureHeader(
      unknownGatewayPaymentId,
      requestId,
      ts,
    );

    getPaymentMock.mockResolvedValueOnce({
      id: unknownGatewayPaymentId,
      status: 'approved',
      transactionAmount: 31.0,
      externalReference: sale.id,
    });

    await request(app.getHttpServer())
      .post('/webhooks/mercadopago')
      .query({ 'data.id': unknownGatewayPaymentId, type: 'payment' })
      .set('x-signature', signature)
      .set('x-request-id', requestId)
      .send({ ...sampleBody, data: { id: unknownGatewayPaymentId } })
      .expect(200);

    const unchangedSale = await prisma.sale.findUniqueOrThrow({
      where: { id: sale.id },
    });
    expect(unchangedSale.status).toBe(SaleStatus.PENDING);
    expect(unchangedSale.completedAt).toBeNull();
  });
});
