import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreditType } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CustomersService } from './customers.service.js';

describe('CustomersService', () => {
  let tx: {
    customer: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    creditTransaction: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  let prisma: {
    customer: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: CustomersService;

  beforeEach(() => {
    tx = {
      customer: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      creditTransaction: {
        create: vi.fn(),
      },
    };
    prisma = {
      customer: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    service = new CustomersService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('cria cliente com balanceCents > 0 e grava CreditTransaction INITIAL na mesma transação', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      const createdAt = new Date('2026-11-25T19:00:00.000Z');
      const createdCustomer = {
        id: 'cust-1',
        name: 'Maria Clara',
        cpf: '12345678901',
        balanceCents: 5000,
        createdAt,
      };
      tx.customer.create.mockResolvedValue(createdCustomer);
      tx.creditTransaction.create.mockResolvedValue({
        id: 'tx-1',
        customerId: 'cust-1',
        saleId: null,
        type: CreditType.INITIAL,
        amountCents: 5000,
        createdAt,
      });

      const result = await service.create({
        name: '  Maria Clara  ',
        cpf: '12345678901',
        balanceCents: 5000,
      });

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { cpf: '12345678901' },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'Maria Clara',
          cpf: '12345678901',
          balanceCents: 5000,
        },
      });
      expect(tx.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          type: CreditType.INITIAL,
          amountCents: 5000,
        },
      });
      expect(result).toEqual(createdCustomer);
    });

    it('cria cliente com balanceCents === 0 sem gravar CreditTransaction', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      const createdAt = new Date('2026-11-25T19:00:00.000Z');
      const createdCustomer = {
        id: 'cust-2',
        name: 'João Pedro',
        cpf: '98765432100',
        balanceCents: 0,
        createdAt,
      };
      tx.customer.create.mockResolvedValue(createdCustomer);

      const result = await service.create({
        name: 'João Pedro',
        cpf: '98765432100',
        balanceCents: 0,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'João Pedro',
          cpf: '98765432100',
          balanceCents: 0,
        },
      });
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
      expect(result).toEqual(createdCustomer);
    });

    it('rejeita com ConflictException e mensagem exata quando CPF já existe (pré-checagem)', async () => {
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-existente',
        cpf: '12345678901',
      });

      const erro = await service
        .create({
          name: 'Outro Cliente',
          cpf: '12345678901',
          balanceCents: 1000,
        })
        .catch((e) => e);

      expect(erro).toBeInstanceOf(ConflictException);
      expect(erro.message).toBe('Já existe um cliente com este CPF.');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.customer.create).not.toHaveBeenCalled();
    });

    it('converte erro P2002 do Prisma em ConflictException com mensagem exata', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      tx.customer.create.mockRejectedValue({ code: 'P2002' });

      const erro = await service
        .create({
          name: 'Cliente Concorrente',
          cpf: '12345678901',
          balanceCents: 1000,
        })
        .catch((e) => e);

      expect(erro).toBeInstanceOf(ConflictException);
      expect(erro.message).toBe('Já existe um cliente com este CPF.');
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('lista todos os clientes ordenados por nome em ordem crescente', async () => {
      const clientes = [
        {
          id: 'cust-1',
          name: 'Ana Beatriz',
          cpf: '11122233344',
          balanceCents: 2500,
          createdAt: new Date('2026-11-25T19:00:00.000Z'),
        },
        {
          id: 'cust-2',
          name: 'Bruno Silva',
          cpf: '55566677788',
          balanceCents: 0,
          createdAt: new Date('2026-11-25T19:00:00.000Z'),
        },
      ];
      prisma.customer.findMany.mockResolvedValue(clientes);

      const result = await service.findAll();

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(clientes);
    });
  });

  describe('addCredit', () => {
    it('incrementa balanceCents atomicamente e grava CreditTransaction TOP_UP na mesma transação', async () => {
      const existingCustomer = {
        id: 'cust-1',
        name: 'Maria Clara',
        cpf: '12345678901',
        balanceCents: 5000,
        createdAt: new Date('2026-11-25T19:00:00.000Z'),
      };
      const updatedCustomer = {
        ...existingCustomer,
        balanceCents: 7500,
      };
      tx.customer.findUnique.mockResolvedValue(existingCustomer);
      tx.customer.update.mockResolvedValue(updatedCustomer);
      tx.creditTransaction.create.mockResolvedValue({
        id: 'tx-topup-1',
        customerId: 'cust-1',
        saleId: null,
        type: CreditType.TOP_UP,
        amountCents: 2500,
        createdAt: new Date('2026-11-26T17:00:00.000Z'),
      });

      const result = await service.addCredit('cust-1', 2500);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(tx.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { balanceCents: { increment: 2500 } },
      });
      expect(tx.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          type: CreditType.TOP_UP,
          amountCents: 2500,
        },
      });
      expect(result).toEqual(updatedCustomer);
    });

    it('lança NotFoundException quando cliente não existe sem atualizar saldo nem criar transação', async () => {
      tx.customer.findUnique.mockResolvedValue(null);

      const erro = await service
        .addCredit('cust-inexistente', 2500)
        .catch((e) => e);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-inexistente' },
      });
      expect(erro).toBeInstanceOf(NotFoundException);
      expect(erro.message).toBe('Cliente não encontrado.');
      expect(tx.customer.update).not.toHaveBeenCalled();
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    });
  });
});
