import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { Role } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';

const DUPLICATE_BARCODE_MESSAGE =
  'Já existe um produto com este código de barras.';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const name = dto.name.trim();

    const existing = await this.prisma.product.findUnique({
      where: { barcode: dto.barcode },
    });
    if (existing) {
      throw new ConflictException(DUPLICATE_BARCODE_MESSAGE);
    }

    try {
      return await this.prisma.product.create({
        data: {
          name,
          barcode: dto.barcode,
          priceCents: dto.priceCents,
          active: true,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: unknown }).code === 'P2002'
      ) {
        throw new ConflictException(DUPLICATE_BARCODE_MESSAGE);
      }
      throw error;
    }
  }

  listForRole(role: string, search?: string) {
    const where: Prisma.ProductWhereInput = {};

    if (role !== Role.MANAGER) {
      where.active = true;
    }

    const term = search?.trim();
    if (term) {
      where.name = { contains: term, mode: 'insensitive' };
    }

    return this.prisma.product.findMany({
      ...(Object.keys(where).length > 0 ? { where } : {}),
      orderBy: { name: 'asc' },
    });
  }

  async findActiveByBarcode(barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode: barcode.trim(), active: true },
    });
    if (!product) {
      throw new NotFoundException('Produto não localizado.');
    }
    return product;
  }

  findActive() {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }
}
