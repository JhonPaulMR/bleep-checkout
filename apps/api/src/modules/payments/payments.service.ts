import {
  ForbiddenException,
  Inject,
  Injectable,
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
import { PayExternalDto } from './dto/pay-external.dto.js';
import { PayWithCardDto } from './dto/pay-with-card.dto.js';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from './payment-gateway.interface.js';
import {
  canTransitionPayment,
  canTransitionSale,
} from './payment-state-machine.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async payWithCard(saleId: string, dto: PayWithCardDto, operatorId: string) {
    const sale = await this.findOpenOwnedSale(saleId, operatorId);

    const payment = await this.prisma.payment.create({
      data: {
        saleId: sale.id,
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
        amountCents: sale.totalCents,
      },
    });

    const payerEmail = dto.payerEmail ?? sale.operator.email;

    const gatewayResult = await this.gateway.createCardPayment({
      transactionAmount: sale.totalCents / 100,
      token: dto.token,
      paymentMethodId: dto.paymentMethodId,
      installments: dto.installments,
      payerEmail,
      identification: {
        type: dto.identification.type,
        number: dto.identification.number,
      },
      externalReference: sale.id,
      idempotencyKey: payment.id,
      description: `Venda #${sale.number}`,
    });

    const { operator: _operator, ...saleSnapshot } = sale;

    return this.prisma.$transaction(async (tx) => {
      if (gatewayResult.status === 'approved') {
        if (
          !canTransitionPayment(payment.status, PaymentStatus.APPROVED) ||
          !canTransitionSale(sale.status, SaleStatus.COMPLETED)
        ) {
          throw new UnprocessableEntityException(
            'Transição de estado inválida para aprovação do pagamento.',
          );
        }

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            gatewayPaymentId: gatewayResult.id,
            status: PaymentStatus.APPROVED,
          },
        });

        const updatedSale = await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: SaleStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        return { payment: updatedPayment, sale: updatedSale };
      }

      if (gatewayResult.status === 'rejected') {
        if (!canTransitionPayment(payment.status, PaymentStatus.DECLINED)) {
          throw new UnprocessableEntityException(
            'Transição de estado inválida para recusa do pagamento.',
          );
        }

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            gatewayPaymentId: gatewayResult.id,
            status: PaymentStatus.DECLINED,
          },
        });

        return { payment: updatedPayment, sale: saleSnapshot };
      }

      if (!canTransitionSale(sale.status, SaleStatus.PENDING)) {
        throw new UnprocessableEntityException(
          'Transição de estado inválida para pagamento em análise.',
        );
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          gatewayPaymentId: gatewayResult.id,
        },
      });

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.PENDING,
        },
      });

      return { payment: updatedPayment, sale: updatedSale };
    });
  }

  async payWithPix(saleId: string, operatorId: string) {
    const sale = await this.findOpenOwnedSale(saleId, operatorId);

    const payment = await this.prisma.payment.create({
      data: {
        saleId: sale.id,
        method: PaymentMethod.PIX,
        status: PaymentStatus.PENDING,
        amountCents: sale.totalCents,
      },
    });

    const gatewayResult = await this.gateway.createPixPayment({
      transactionAmount: sale.totalCents / 100,
      payerEmail: sale.operator.email,
      externalReference: sale.id,
      idempotencyKey: payment.id,
      description: `Venda #${sale.number}`,
    });

    return this.prisma.$transaction(async (tx) => {
      if (!canTransitionSale(sale.status, SaleStatus.PENDING)) {
        throw new UnprocessableEntityException(
          'Transição de estado inválida para pagamento PIX.',
        );
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          gatewayPaymentId: gatewayResult.id,
          qrCode: gatewayResult.qrCode ?? null,
          qrCodeBase64: gatewayResult.qrCodeBase64 ?? null,
        },
      });

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.PENDING,
        },
      });

      return { payment: updatedPayment, sale: updatedSale };
    });
  }

  async payWithCustomerCredit(saleId: string, operatorId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada.');
    }

    if (sale.operatorId !== operatorId) {
      throw new ForbiddenException(
        'Você não tem permissão para cobrar esta venda.',
      );
    }

    if (sale.status !== SaleStatus.OPEN || sale.totalCents <= 0) {
      throw new UnprocessableEntityException(
        'Venda não está aberta para pagamento.',
      );
    }

    if (!sale.customerId) {
      throw new UnprocessableEntityException(
        'Selecione um cliente para pagar com crédito.',
      );
    }

    const customerId = sale.customerId;

    return this.prisma.$transaction(async (tx) => {
      const debited = await tx.customer.updateMany({
        where: {
          id: customerId,
          balanceCents: { gte: sale.totalCents },
        },
        data: {
          balanceCents: { decrement: sale.totalCents },
        },
      });

      if (debited.count === 0) {
        throw new UnprocessableEntityException('Saldo insuficiente.');
      }

      const updatedSaleCount = await tx.sale.updateMany({
        where: {
          id: sale.id,
          status: SaleStatus.OPEN,
        },
        data: {
          status: SaleStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      if (updatedSaleCount.count === 0) {
        throw new UnprocessableEntityException(
          'Venda não está aberta para pagamento.',
        );
      }

      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          method: PaymentMethod.CUSTOMER_CREDIT,
          status: PaymentStatus.APPROVED,
          amountCents: sale.totalCents,
        },
      });

      await tx.creditTransaction.create({
        data: {
          customerId,
          saleId: sale.id,
          type: CreditType.SALE_DEBIT,
          amountCents: sale.totalCents,
        },
      });

      const updatedCustomer = await tx.customer.findUniqueOrThrow({
        where: { id: customerId },
      });

      const updatedSale = await tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
        },
      });

      return {
        sale: updatedSale,
        payment,
        customerBalanceCents: updatedCustomer.balanceCents,
      };
    });
  }

  async payExternal(saleId: string, dto: PayExternalDto, operatorId: string) {
    const sale = await this.findOpenOwnedSale(saleId, operatorId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.approved) {
        const updatedSaleCount = await tx.sale.updateMany({
          where: {
            id: sale.id,
            status: SaleStatus.OPEN,
          },
          data: {
            status: SaleStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        if (updatedSaleCount.count === 0) {
          throw new UnprocessableEntityException(
            'A venda não está aberta para pagamento.',
          );
        }

        const payment = await tx.payment.create({
          data: {
            saleId: sale.id,
            method: dto.method,
            status: PaymentStatus.APPROVED,
            amountCents: sale.totalCents,
          },
        });

        const updatedSale = await tx.sale.findUniqueOrThrow({
          where: { id: sale.id },
          include: {
            items: { include: { product: true } },
            payments: true,
            customer: true,
          },
        });

        return { payment, sale: updatedSale };
      }

      const openSale = await tx.sale.findFirst({
        where: {
          id: sale.id,
          status: SaleStatus.OPEN,
        },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
        },
      });

      if (!openSale) {
        throw new UnprocessableEntityException(
          'A venda não está aberta para pagamento.',
        );
      }

      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          method: dto.method,
          status: PaymentStatus.DECLINED,
          amountCents: sale.totalCents,
        },
      });

      return {
        payment,
        sale: {
          ...openSale,
          payments: [...openSale.payments, payment],
        },
      };
    });
  }

  private async findOpenOwnedSale(saleId: string, operatorId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { operator: { select: { email: true } } },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada.');
    }

    if (sale.operatorId !== operatorId) {
      throw new ForbiddenException(
        'Você não tem permissão para cobrar esta venda.',
      );
    }

    if (sale.status !== SaleStatus.OPEN) {
      throw new UnprocessableEntityException(
        'A venda não está aberta para pagamento.',
      );
    }

    return sale;
  }
}
