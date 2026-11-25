import { ConflictException, Injectable } from '@nestjs/common';
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

  listForRole(role: string) {
    if (role === Role.MANAGER) {
      return this.prisma.product.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return this.findActive();
  }

  // TODO #4: expandir listagem mínima de produtos ativos no caixa com busca e código de barras
  findActive() {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }
}
