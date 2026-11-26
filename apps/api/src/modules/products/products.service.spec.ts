import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '../../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  let prisma: {
    product: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('cria produto com active: true e aplica trim() no nome', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      const createdAt = new Date('2026-11-25T18:00:00.000Z');
      const createdProduct = {
        id: 'prod-1',
        name: 'Café Expresso 250g',
        barcode: '7891000100103',
        priceCents: 1490,
        active: true,
        createdAt,
      };
      prisma.product.create.mockResolvedValue(createdProduct);

      const result = await service.create({
        name: '  Café Expresso 250g  ',
        barcode: '7891000100103',
        priceCents: 1490,
      });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { barcode: '7891000100103' },
      });
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Café Expresso 250g',
          barcode: '7891000100103',
          priceCents: 1490,
          active: true,
        },
      });
      expect(result).toEqual(createdProduct);
    });

    it('rejeita com ConflictException e mensagem exata quando código de barras já existe', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-existente',
        barcode: '7891000100103',
      });

      const erro = await service
        .create({
          name: 'Outro Produto',
          barcode: '7891000100103',
          priceCents: 990,
        })
        .catch((e) => e);

      expect(erro).toBeInstanceOf(ConflictException);
      expect(erro.message).toBe(
        'Já existe um produto com este código de barras.',
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('converte erro P2002 do Prisma em ConflictException com mensagem exata', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockRejectedValue({ code: 'P2002' });

      const erro = await service
        .create({
          name: 'Produto Concorrente',
          barcode: '7891000100103',
          priceCents: 990,
        })
        .catch((e) => e);

      expect(erro).toBeInstanceOf(ConflictException);
      expect(erro.message).toBe(
        'Já existe um produto com este código de barras.',
      );
    });
  });

  describe('listForRole', () => {
    it('lista apenas produtos ativos ordenados por nome para OPERATOR', async () => {
      const ativos = [
        {
          id: 'prod-1',
          name: 'Água Mineral 500ml',
          barcode: '7891000100101',
          priceCents: 350,
          active: true,
          createdAt: new Date('2026-11-25T18:00:00.000Z'),
        },
      ];
      prisma.product.findMany.mockResolvedValue(ativos);

      const result = await service.listForRole(Role.OPERATOR);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(ativos);
    });

    it('lista todo o catálogo ordenado por nome para MANAGER', async () => {
      const catalogo = [
        {
          id: 'prod-1',
          name: 'Água Mineral 500ml',
          barcode: '7891000100101',
          priceCents: 350,
          active: true,
          createdAt: new Date('2026-11-25T18:00:00.000Z'),
        },
        {
          id: 'prod-2',
          name: 'Biscoito Desativado',
          barcode: '7891000100102',
          priceCents: 450,
          active: false,
          createdAt: new Date('2026-11-25T18:00:00.000Z'),
        },
      ];
      prisma.product.findMany.mockResolvedValue(catalogo);

      const result = await service.listForRole(Role.MANAGER);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(catalogo);
    });

    it('filtra por nome case-insensitive mantendo active: true para OPERATOR', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.listForRole(Role.OPERATOR, '  café  ');

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          name: { contains: 'café', mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('filtra por nome case-insensitive sem restrição de active para MANAGER', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.listForRole(Role.MANAGER, 'Biscoito');

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'Biscoito', mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('ignora search vazio ou apenas espaços', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.listForRole(Role.OPERATOR, '   ');

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { name: 'asc' },
      });

      await service.listForRole(Role.MANAGER, '   ');

      expect(prisma.product.findMany).toHaveBeenLastCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findActiveByBarcode', () => {
    it('retorna produto ativo correspondente ao código de barras com trim()', async () => {
      const produto = {
        id: 'prod-1',
        name: 'Café Expresso 250g',
        barcode: '7891000100103',
        priceCents: 1490,
        active: true,
        createdAt: new Date('2026-11-25T18:00:00.000Z'),
      };
      prisma.product.findFirst.mockResolvedValue(produto);

      const result = await service.findActiveByBarcode('  7891000100103  ');

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { barcode: '7891000100103', active: true },
      });
      expect(result).toEqual(produto);
    });

    it('lança NotFoundException com mensagem exata quando produto não existe ou está inativo', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      const erro = await service
        .findActiveByBarcode('7891000999999')
        .catch((e) => e);

      expect(erro).toBeInstanceOf(NotFoundException);
      expect(erro.message).toBe('Produto não localizado.');
    });
  });
});
