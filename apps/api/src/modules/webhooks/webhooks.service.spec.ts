import { UnauthorizedException } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
} from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PaymentGateway } from '../payments/payment-gateway.interface.js';
import type { WebhookSignatureValidator } from './webhook-signature.validator.js';
import { WebhooksService } from './webhooks.service.js';

describe('WebhooksService', () => {
  let signatureValidator: {
    isValid: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    webhookEvent: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    sale: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    payment: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let gateway: {
    createCardPayment: ReturnType<typeof vi.fn>;
    createPixPayment: ReturnType<typeof vi.fn>;
    getPayment: ReturnType<typeof vi.fn>;
  };
  let service: WebhooksService;

  const baseInput = {
    signatureHeader: 'ts=1732471000,v1=valid-sig',
    requestId: 'req-evt-001',
    query: { 'data.id': 'mp-pay-100', type: 'payment' },
    body: {
      id: 12345,
      type: 'payment',
      action: 'payment.updated',
      data: { id: 'mp-pay-100' },
    },
  };

  const pendingSale = {
    id: 'sale-1',
    number: 1,
    operatorId: 'op-1',
    status: SaleStatus.PENDING,
    totalCents: 3580,
    createdAt: new Date('2026-11-24T12:00:00.000Z'),
    completedAt: null,
  };

  const pendingPayment = {
    id: 'pay-1',
    saleId: 'sale-1',
    method: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    amountCents: 3580,
    gatewayPaymentId: 'mp-pay-100',
    qrCode: '000201...',
    qrCodeBase64: null,
    createdAt: new Date('2026-11-24T12:01:00.000Z'),
  };

  beforeEach(() => {
    signatureValidator = {
      isValid: vi.fn().mockReturnValue(true),
    };

    prisma = {
      webhookEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'we-1' }),
      },
      sale: {
        findUnique: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        findUnique: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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

    service = new WebhooksService(
      signatureValidator as unknown as WebhookSignatureValidator,
      prisma as unknown as PrismaService,
      gateway as unknown as PaymentGateway,
    );
  });

  it('rejeita com 401 quando a assinatura é inválida, sem gravar WebhookEvent nem consultar o gateway', async () => {
    signatureValidator.isValid.mockReturnValue(false);

    await expect(service.handleMercadoPago(baseInput)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(prisma.webhookEvent.findUnique).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(gateway.getPayment).not.toHaveBeenCalled();
  });

  it('ignora eventos cujo type não seja payment e responde 200 sem chamar o gateway', async () => {
    const result = await service.handleMercadoPago({
      ...baseInput,
      query: { 'data.id': 'mp-pay-100', type: 'merchant_order' },
      body: { type: 'merchant_order', data: { id: 'mp-pay-100' } },
    });

    expect(result).toEqual({ received: true });
    expect(prisma.webhookEvent.findUnique).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(gateway.getPayment).not.toHaveBeenCalled();
  });

  it('conclui venda PENDING (PIX ou cartão em análise) e aprova pagamento usando updateMany condicional dentro da transação', async () => {
    const callOrder: string[] = [];
    gateway.getPayment.mockImplementation(async () => {
      callOrder.push('gateway.getPayment');
      return {
        id: 'mp-pay-100',
        status: 'approved',
        transactionAmount: 35.8,
        externalReference: 'sale-1',
      };
    });
    prisma.webhookEvent.create.mockImplementation(async () => {
      callOrder.push('webhookEvent.create');
      return { id: 'we-1' };
    });
    prisma.sale.findUnique.mockResolvedValue(pendingSale);
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(callOrder).toEqual(['gateway.getPayment', 'webhookEvent.create']);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        gatewayEventId: 'req-evt-001',
        payload: expect.anything(),
      },
    });
    expect(gateway.getPayment).toHaveBeenCalledWith('mp-pay-100');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay-1', status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.APPROVED },
    });
    expect(prisma.sale.updateMany).toHaveBeenCalledWith({
      where: { id: 'sale-1', status: SaleStatus.PENDING },
      data: {
        status: SaleStatus.COMPLETED,
        completedAt: expect.any(Date),
      },
    });
  });

  it('volta venda PENDING para OPEN e marca pagamento como DECLINED usando updateMany condicional quando gateway confirma rejected', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'rejected',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue(pendingSale);
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay-1', status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.DECLINED },
    });
    expect(prisma.sale.updateMany).toHaveBeenCalledWith({
      where: { id: 'sale-1', status: SaleStatus.PENDING },
      data: { status: SaleStatus.OPEN },
    });
  });

  it('não aplica transição na venda quando updateMany do pagamento retorna count 0 (condição de corrida TOCTOU)', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'approved',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue(pendingSale);
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay-1', status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.APPROVED },
    });
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it('trata repetição com mesmo gatewayEventId já persistido como idempotente e responde 200 sem consultar o gateway', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'we-1',
      gatewayEventId: 'req-evt-001',
    });

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(gateway.getPayment).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('trata corrida concorrente com mesmo gatewayEventId (P2002 na transação) como idempotente e responde 200', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'approved',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.webhookEvent.create.mockRejectedValue({ code: 'P2002' });

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it('ignora segunda entrega approved quando venda já está COMPLETED (ex.: resposta síncrona seguida de webhook)', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'approved',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue({
      ...pendingSale,
      status: SaleStatus.COMPLETED,
      completedAt: new Date('2026-11-24T12:02:00.000Z'),
    });
    prisma.payment.findUnique.mockResolvedValue({
      ...pendingPayment,
      status: PaymentStatus.APPROVED,
    });

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it.each(['pending', 'in_process', 'rejected'] as const)(
    'ignora notificação atrasada (%s) em venda já COMPLETED sem regredir estado',
    async (lateStatus) => {
      gateway.getPayment.mockResolvedValue({
        id: 'mp-pay-100',
        status: lateStatus,
        transactionAmount: 35.8,
        externalReference: 'sale-1',
      });
      prisma.sale.findUnique.mockResolvedValue({
        ...pendingSale,
        status: SaleStatus.COMPLETED,
        completedAt: new Date('2026-11-24T12:02:00.000Z'),
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.APPROVED,
      });

      const result = await service.handleMercadoPago(baseInput);

      expect(result).toEqual({ received: true });
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
    },
  );

  it('ignora notificação approved em venda CANCELED sem alterar venda nem pagamento', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'approved',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue({
      ...pendingSale,
      status: SaleStatus.CANCELED,
    });
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it('não regride venda PENDING para OPEN quando chega webhook atrasado rejected de um Payment já DECLINED', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'rejected',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue(pendingSale);
    prisma.payment.findUnique.mockResolvedValue({
      ...pendingPayment,
      status: PaymentStatus.DECLINED,
    });

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it('não conclui venda quando o Payment correspondente ao gatewayPaymentId não existe no banco', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-inexistente',
      status: 'approved',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue(pendingSale);
    prisma.payment.findUnique.mockResolvedValue(null);

    const result = await service.handleMercadoPago({
      ...baseInput,
      query: { 'data.id': 'mp-pay-inexistente', type: 'payment' },
    });

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it('transiciona venda OPEN para PENDING em webhook pending/in_process apenas se Payment existir e estiver PENDING', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'in_process',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue({
      ...pendingSale,
      status: SaleStatus.OPEN,
    });
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).toHaveBeenCalledWith({
      where: { id: 'sale-1', status: SaleStatus.OPEN },
      data: { status: SaleStatus.PENDING },
    });
  });

  it('não transiciona venda OPEN para PENDING em webhook pending quando Payment já está DECLINED', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'pending',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue({
      ...pendingSale,
      status: SaleStatus.OPEN,
    });
    prisma.payment.findUnique.mockResolvedValue({
      ...pendingPayment,
      status: PaymentStatus.DECLINED,
    });

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it('não conclui venda quando transactionAmount diverge de sale.totalCents', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'approved',
      transactionAmount: 1.0,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue(pendingSale);
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it('não conclui venda quando externalReference diverge de payment.saleId', async () => {
    gateway.getPayment.mockResolvedValue({
      id: 'mp-pay-100',
      status: 'approved',
      transactionAmount: 35.8,
      externalReference: 'sale-1',
    });
    prisma.sale.findUnique.mockResolvedValue(pendingSale);
    prisma.payment.findUnique.mockResolvedValue({
      ...pendingPayment,
      saleId: 'sale-outra',
    });

    const result = await service.handleMercadoPago(baseInput);

    expect(result).toEqual({ received: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.sale.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    { status: 404, message: 'Payment not found' },
    { statusCode: 404, message: 'Not found' },
    { cause: { status: 404 }, message: 'SDK 404' },
  ])(
    'responde 200 sem erro quando o gateway retorna 404 (ex.: simulação 1212 do painel)',
    async (notFoundError) => {
      gateway.getPayment.mockRejectedValue(notFoundError);

      const result = await service.handleMercadoPago({
        ...baseInput,
        query: { 'data.id': '1212', type: 'payment' },
      });

      expect(result).toEqual({ received: true });
      expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('relança erro transitório (503 / falha de rede) em gateway.getPayment sem gravar WebhookEvent', async () => {
    const transientError = Object.assign(new Error('Service Unavailable'), {
      status: 503,
    });
    gateway.getPayment.mockRejectedValue(transientError);

    await expect(service.handleMercadoPago(baseInput)).rejects.toThrow(
      'Service Unavailable',
    );

    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
