import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PaymentStatus, SaleStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PAYMENT_GATEWAY,
  type GatewayPaymentResult,
  type GatewayPaymentStatus,
  type PaymentGateway,
} from '../payments/payment-gateway.interface.js';
import {
  canTransitionPayment,
  canTransitionSale,
} from '../payments/payment-state-machine.js';
import { WebhookSignatureValidator } from './webhook-signature.validator.js';

export interface MercadoPagoWebhookInput {
  signatureHeader?: string;
  requestId?: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
}

interface TargetTransition {
  paymentStatus?: PaymentStatus;
  saleStatus: SaleStatus;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly signatureValidator: WebhookSignatureValidator,
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async handleMercadoPago(
    input: MercadoPagoWebhookInput,
  ): Promise<{ received: true }> {
    const dataId = this.extractDataId(input.query);
    const requestId = input.requestId;

    const valid = this.signatureValidator.isValid({
      signatureHeader: input.signatureHeader,
      requestId,
      dataId,
    });
    if (!valid || !dataId || !requestId) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    const eventType = this.extractEventType(input.query, input.body);
    if (eventType !== 'payment') {
      return { received: true };
    }

    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { gatewayEventId: requestId },
    });
    if (existingEvent) {
      return { received: true };
    }

    let gatewayPayment: GatewayPaymentResult | undefined;
    try {
      gatewayPayment = await this.gateway.getPayment(dataId);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        this.logger.warn(
          `Pagamento ${dataId} não encontrado no gateway (404): ${error instanceof Error ? error.message : String(error)}`,
        );
        return { received: true };
      }
      throw error;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.webhookEvent.create({
          data: {
            gatewayEventId: requestId,
            payload: {
              query: input.query,
              body: input.body,
            } as Prisma.InputJsonValue,
          },
        });

        if (!gatewayPayment || !gatewayPayment.externalReference) {
          return;
        }

        const target = this.mapGatewayStatus(gatewayPayment.status);
        if (!target) {
          return;
        }

        const externalReference = gatewayPayment.externalReference;
        const expectedAmountCents = Math.round(
          gatewayPayment.transactionAmount * 100,
        );

        const sale = await tx.sale.findUnique({
          where: { id: externalReference },
        });
        if (!sale) {
          return;
        }

        if (
          externalReference !== sale.id ||
          expectedAmountCents !== sale.totalCents
        ) {
          this.logger.warn(
            `Divergência de pedido/valor no webhook para pagamento ${dataId}: sale=${sale.id}, esperado=${sale.totalCents}, recebido=${expectedAmountCents}`,
          );
          return;
        }

        const payment = await tx.payment.findUnique({
          where: { gatewayPaymentId: dataId },
        });
        if (!payment) {
          this.logger.warn(
            `Pagamento ${dataId} não encontrado na base local para a venda ${sale.id}.`,
          );
          return;
        }
        if (payment.saleId !== sale.id) {
          this.logger.warn(
            `Divergência de vínculo entre Payment (${payment.id}) e Sale (${sale.id}) no webhook ${dataId}.`,
          );
          return;
        }

        if (
          sale.status === SaleStatus.COMPLETED ||
          sale.status === SaleStatus.CANCELED
        ) {
          return;
        }

        if (target.paymentStatus) {
          if (!canTransitionPayment(payment.status, target.paymentStatus)) {
            return;
          }

          const updatedPayment = await tx.payment.updateMany({
            where: { id: payment.id, status: payment.status },
            data: { status: target.paymentStatus },
          });
          if (updatedPayment.count !== 1) {
            return;
          }

          if (canTransitionSale(sale.status, target.saleStatus)) {
            await tx.sale.updateMany({
              where: { id: sale.id, status: sale.status },
              data:
                target.saleStatus === SaleStatus.COMPLETED
                  ? { status: SaleStatus.COMPLETED, completedAt: new Date() }
                  : { status: target.saleStatus },
            });
          }
          return;
        }

        if (
          payment.status === PaymentStatus.PENDING &&
          canTransitionSale(sale.status, target.saleStatus)
        ) {
          await tx.sale.updateMany({
            where: { id: sale.id, status: sale.status },
            data: { status: target.saleStatus },
          });
        }
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return { received: true };
      }
      throw error;
    }

    return { received: true };
  }

  private mapGatewayStatus(
    status: GatewayPaymentStatus,
  ): TargetTransition | null {
    switch (status) {
      case 'approved':
        return {
          paymentStatus: PaymentStatus.APPROVED,
          saleStatus: SaleStatus.COMPLETED,
        };
      case 'rejected':
        return {
          paymentStatus: PaymentStatus.DECLINED,
          saleStatus: SaleStatus.OPEN,
        };
      case 'pending':
      case 'in_process':
        return {
          saleStatus: SaleStatus.PENDING,
        };
      default:
        return null;
    }
  }

  private extractEventType(
    query: Record<string, unknown>,
    body: Record<string, unknown>,
  ): string | undefined {
    if (typeof query['type'] === 'string') {
      return query['type'];
    }
    if (typeof body['type'] === 'string') {
      return body['type'];
    }
    return undefined;
  }

  private extractDataId(query: Record<string, unknown>): string | undefined {
    const rawDataId =
      query['data.id'] ??
      (typeof query['data'] === 'object' && query['data'] !== null
        ? (query['data'] as Record<string, unknown>)['id']
        : undefined);

    return typeof rawDataId === 'string' ? rawDataId : undefined;
  }

  private isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const err = error as {
      status?: unknown;
      statusCode?: unknown;
      cause?: { status?: unknown; statusCode?: unknown };
    };
    return (
      err.status === 404 ||
      err.statusCode === 404 ||
      err.cause?.status === 404 ||
      err.cause?.statusCode === 404
    );
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}
