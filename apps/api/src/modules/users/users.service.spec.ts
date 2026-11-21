import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('createOperator', () => {
    it('cria operador com hash argon2, papel OPERATOR fixo, createdById e sem passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const createdAt = new Date('2026-11-21T12:00:00.000Z');
      prisma.user.create.mockResolvedValue({
        id: 'op-1',
        name: 'Maria Silva',
        email: 'maria@teste.local',
        role: Role.OPERATOR,
        createdById: 'manager-1',
        createdAt,
      });

      const result = await service.createOperator(
        {
          name: '  Maria Silva  ',
          email: '  Maria@Teste.Local  ',
          password: 'Senha@123',
        },
        'manager-1',
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'maria@teste.local' },
      });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);

      const createArgs = prisma.user.create.mock.calls[0][0];
      expect(createArgs.data.name).toBe('Maria Silva');
      expect(createArgs.data.email).toBe('maria@teste.local');
      expect(createArgs.data.role).toBe(Role.OPERATOR);
      expect(createArgs.data.createdById).toBe('manager-1');
      expect(createArgs.data.passwordHash).not.toBe('Senha@123');
      expect(
        await argon2.verify(createArgs.data.passwordHash, 'Senha@123'),
      ).toBe(true);
      expect(createArgs.select).toEqual({
        id: true,
        name: true,
        email: true,
        role: true,
        createdById: true,
        createdAt: true,
      });

      expect(result).toEqual({
        id: 'op-1',
        name: 'Maria Silva',
        email: 'maria@teste.local',
        role: Role.OPERATOR,
        createdById: 'manager-1',
        createdAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejeita com ConflictException quando o e-mail já está em uso', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-existente',
        email: 'existente@teste.local',
      });

      const erro = await service
        .createOperator(
          {
            name: 'Outro Operador',
            email: 'existente@teste.local',
            password: 'Senha@123',
          },
          'manager-1',
        )
        .catch((e) => e);

      expect(erro).toBeInstanceOf(ConflictException);
      expect(erro.message).toBe('Já existe um usuário com este e-mail.');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
