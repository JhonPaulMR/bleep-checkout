import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreditType } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';

const DUPLICATE_CPF_MESSAGE = 'Já existe um cliente com este CPF.';
const CUSTOMER_NOT_FOUND_MESSAGE = 'Cliente não encontrado.';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const name = dto.name.trim();
    const cpf = dto.cpf.replace(/\D/g, '');

    const existing = await this.prisma.customer.findUnique({
      where: { cpf },
    });
    if (existing) {
      throw new ConflictException(DUPLICATE_CPF_MESSAGE);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            name,
            cpf,
            balanceCents: dto.balanceCents,
          },
        });

        if (dto.balanceCents > 0) {
          await tx.creditTransaction.create({
            data: {
              customerId: customer.id,
              type: CreditType.INITIAL,
              amountCents: dto.balanceCents,
            },
          });
        }

        return customer;
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: unknown }).code === 'P2002'
      ) {
        throw new ConflictException(DUPLICATE_CPF_MESSAGE);
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async addCredit(customerId: string, amountCents: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({
        where: { id: customerId },
      });
      if (!existing) {
        throw new NotFoundException(CUSTOMER_NOT_FOUND_MESSAGE);
      }

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { balanceCents: { increment: amountCents } },
      });

      await tx.creditTransaction.create({
        data: {
          customerId,
          type: CreditType.TOP_UP,
          amountCents,
        },
      });

      return updated;
    });
  }
}
