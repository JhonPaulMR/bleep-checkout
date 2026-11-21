import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateOperatorDto } from './dto/create-operator.dto.js';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdById: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createOperator(dto: CreateOperatorDto, createdById: string) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.OPERATOR,
        createdById,
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  listOperators() {
    return this.prisma.user.findMany({
      where: { role: Role.OPERATOR },
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_USER_SELECT,
    });
  }

  async findByIdForRequester(id: string, requesterId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.id !== requesterId && user.createdById !== requesterId) {
      throw new ForbiddenException(
        'Você não tem permissão para consultar este usuário.',
      );
    }

    return user;
  }
}
