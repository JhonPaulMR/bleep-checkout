import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SaleStatus } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
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
}
