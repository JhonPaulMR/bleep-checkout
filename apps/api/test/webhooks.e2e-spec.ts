import 'dotenv/config';
import { createHmac, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../src/modules/payments/payment-gateway.interface.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Webhooks — POST /webhooks/mercadopago (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  }, 60_000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 200 sem JWT (@Public) quando a assinatura HMAC-SHA256 é válida', async () => {
    const dataId = '987654321';
    const requestId = `req-${randomUUID()}`;
    const ts = '1732471000';
    const signature = buildSignatureHeader(dataId, requestId, ts);

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
});
