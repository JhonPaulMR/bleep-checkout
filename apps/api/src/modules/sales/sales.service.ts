import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaymentStatus, SaleStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { canTransitionSale } from '../payments/payment-state-machine.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';

const SALE_DETAILS_INCLUDE = {
  items: { include: { product: true } },
  payments: { orderBy: { createdAt: 'asc' as const } },
  customer: true,
} as const;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleDto, operatorId: string) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('A venda precisa conter ao menos um item.');
    }

    const quantitiesByProductId = new Map<string, number>();
    for (const item of dto.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException(
          'A quantidade de cada item deve ser um inteiro maior que zero.',
        );
      }

      const current = quantitiesByProductId.get(item.productId) ?? 0;
      quantitiesByProductId.set(item.productId, current + item.quantity);
    }

    const productIds = Array.from(quantitiesByProductId.keys());

    return this.prisma.$transaction(async (tx) => {
      if (dto.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: dto.customerId },
        });
        if (!customer) {
          throw new UnprocessableEntityException('Cliente não encontrado.');
        }
      }

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          active: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new UnprocessableEntityException(
          'Um ou mais produtos informados não existem ou estão inativos.',
        );
      }

      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      let totalCents = 0;
      const saleItemsData = productIds.map((productId) => {
        const product = productsById.get(productId)!;
        const quantity = quantitiesByProductId.get(productId)!;
        totalCents += product.priceCents * quantity;
        return {
          productId: product.id,
          quantity,
          unitPriceCents: product.priceCents,
        };
      });

      return tx.sale.create({
        data: {
          operatorId,
          customerId: dto.customerId ?? null,
          status: SaleStatus.OPEN,
          totalCents,
          items: {
            create: saleItemsData,
          },
        },
        include: SALE_DETAILS_INCLUDE,
      });
    });
  }

  async findAllForOperator(operatorId: string, status?: SaleStatus) {
    return this.prisma.sale.findMany({
      where: {
        operatorId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: SALE_DETAILS_INCLUDE,
    });
  }

  async findByIdForOperator(id: string, requesterId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: SALE_DETAILS_INCLUDE,
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada.');
    }

    if (sale.operatorId !== requesterId) {
      throw new ForbiddenException(
        'Você não tem permissão para consultar esta venda.',
      );
    }

    return sale;
  }

  async cancel(id: string, requesterId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada.');
    }

    if (sale.operatorId !== requesterId) {
      throw new ForbiddenException(
        'Você não tem permissão para cancelar esta venda.',
      );
    }

    this.assertCancelableStatus(sale.status);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sale.updateMany({
        where: {
          id: sale.id,
          status: { in: [SaleStatus.OPEN, SaleStatus.PENDING] },
        },
        data: { status: SaleStatus.CANCELED },
      });

      if (updated.count === 0) {
        const current = await tx.sale.findUnique({
          where: { id: sale.id },
        });
        if (!current) {
          throw new NotFoundException('Venda não encontrada.');
        }
        this.throwUncancelableStatus(current.status);
      }

      await tx.payment.updateMany({
        where: {
          saleId: sale.id,
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.ABANDONED },
      });

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: SALE_DETAILS_INCLUDE,
      });
    });
  }

  async reopen(id: string, requesterId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada.');
    }

    if (sale.operatorId !== requesterId) {
      throw new ForbiddenException(
        'Você não tem permissão para reabrir esta venda.',
      );
    }

    if (
      sale.status !== SaleStatus.PENDING ||
      !canTransitionSale(sale.status, SaleStatus.OPEN)
    ) {
      throw new UnprocessableEntityException(
        'A venda não está pendente para reabertura.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sale.updateMany({
        where: {
          id: sale.id,
          status: SaleStatus.PENDING,
        },
        data: { status: SaleStatus.OPEN },
      });

      if (updated.count === 0) {
        throw new UnprocessableEntityException(
          'A venda não está pendente para reabertura.',
        );
      }

      await tx.payment.updateMany({
        where: {
          saleId: sale.id,
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.ABANDONED },
      });

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: SALE_DETAILS_INCLUDE,
      });
    });
  }

  private assertCancelableStatus(status: SaleStatus): void {
    if (!canTransitionSale(status, SaleStatus.CANCELED)) {
      this.throwUncancelableStatus(status);
    }
  }

  private throwUncancelableStatus(status: SaleStatus): never {
    if (status === SaleStatus.COMPLETED) {
      throw new UnprocessableEntityException(
        'Uma venda concluída não pode ser cancelada.',
      );
    }
    if (status === SaleStatus.CANCELED) {
      throw new UnprocessableEntityException('A venda já está cancelada.');
    }
    throw new UnprocessableEntityException(
      'Não é possível cancelar esta venda no estado atual.',
    );
  }
}
