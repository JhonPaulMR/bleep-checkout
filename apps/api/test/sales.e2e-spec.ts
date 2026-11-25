import 'dotenv/config';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { Role } from '../generated/prisma/enums.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Catálogo mínimo e vendas — /products e /sales (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const createdSaleIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdUserIds: string[] = [];

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.data.accessToken as string;
  };

  async function createTestProduct(options?: {
    name?: string;
    priceCents?: number;
    active?: boolean;
  }) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
    const product = await prisma.product.create({
      data: {
        name: options?.name ?? `Produto Venda ${suffix}`,
        barcode: `789${suffix}`,
        priceCents: options?.priceCents ?? 1250,
        active: options?.active ?? true,
      },
    });
    createdProductIds.push(product.id);
    return product;
  }

  async function createTestOperator() {
    const suffix = randomUUID();
    const email = `operador.venda.${suffix}@teste.local`;
    const password = 'Senha@123';
    const user = await prisma.user.create({
      data: {
        name: 'Outro Operador Venda',
        email,
        passwordHash: await argon2.hash(password),
        role: Role.OPERATOR,
      },
    });
    createdUserIds.push(user.id);
    return { user, email, password };
  }

  beforeAll(async () => {
    execSync('npx prisma db seed', { stdio: 'pipe' });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  }, 60_000);

  afterEach(async () => {
    if (createdSaleIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { saleId: { in: createdSaleIds } },
      });
      await prisma.saleItem.deleteMany({
        where: { saleId: { in: createdSaleIds } },
      });
      await prisma.sale.deleteMany({
        where: { id: { in: createdSaleIds } },
      });
      createdSaleIds.length = 0;
    }
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
      createdProductIds.length = 0;
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /products', () => {
    it('lista apenas produtos ativos para OPERATOR autenticado', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const activeProduct = await createTestProduct({
        name: 'Produto Ativo Caixa',
        priceCents: 990,
        active: true,
      });
      const inactiveProduct = await createTestProduct({
        name: 'Produto Inativo Caixa',
        priceCents: 500,
        active: false,
      });

      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      const ids = response.body.data.map((p: { id: string }) => p.id);
      expect(ids).toContain(activeProduct.id);
      expect(ids).not.toContain(inactiveProduct.id);
    });

    it('devolve 401 sem token', async () => {
      await request(app.getHttpServer()).get('/products').expect(401);
    });

    it('permite listagem de produtos para MANAGER (US01 CA4)', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });
  });

  describe('POST /sales', () => {
    it('cria venda OPEN com totalCents calculado no servidor a partir dos preços do banco e devolve 201', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prodA = await createTestProduct({ priceCents: 1500 });
      const prodB = await createTestProduct({ priceCents: 450 });

      const response = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          items: [
            { productId: prodA.id, quantity: 2 },
            { productId: prodB.id, quantity: 3 },
          ],
        })
        .expect(201);

      const sale = response.body.data;
      createdSaleIds.push(sale.id);

      expect(sale.status).toBe('OPEN');
      expect(sale.totalCents).toBe(1500 * 2 + 450 * 3);
      expect(sale.items).toHaveLength(2);
      const itemA = sale.items.find(
        (i: { productId: string }) => i.productId === prodA.id,
      );
      const itemB = sale.items.find(
        (i: { productId: string }) => i.productId === prodB.id,
      );
      expect(itemA.unitPriceCents).toBe(1500);
      expect(itemA.quantity).toBe(2);
      expect(itemB.unitPriceCents).toBe(450);
      expect(itemB.quantity).toBe(3);
    });

    it.each([
      ['totalCents na raiz', { totalCents: 1 }],
      ['priceCents na raiz', { priceCents: 1 }],
      ['transaction_amount na raiz', { transaction_amount: 0.01 }],
    ])(
      'rejeita com 400 quando o cliente tenta enviar %s',
      async (_label, extraField) => {
        const operatorToken = await login(
          process.env.SEED_OPERATOR_EMAIL!,
          process.env.SEED_OPERATOR_PASSWORD!,
        );
        const prod = await createTestProduct({ priceCents: 2000 });

        await request(app.getHttpServer())
          .post('/sales')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            items: [{ productId: prod.id, quantity: 1 }],
            ...extraField,
          })
          .expect(400);
      },
    );

    it('rejeita com 400 quando item contém campo de preço extra', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 2000 });

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          items: [{ productId: prod.id, quantity: 1, priceCents: 1 }],
        })
        .expect(400);
    });

    it('rejeita com 400 para lista de itens vazia ou quantidade <= 0', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1000 });

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [] })
        .expect(400);

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 0 }] })
        .expect(400);
    });

    it('rejeita com 422 para produto inativo ou inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const inactiveProduct = await createTestProduct({
        priceCents: 1000,
        active: false,
      });

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: inactiveProduct.id, quantity: 1 }] })
        .expect(422);

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: randomUUID(), quantity: 1 }] })
        .expect(422);
    });

    it('devolve 401 sem token', async () => {
      await request(app.getHttpServer())
        .post('/sales')
        .send({ items: [{ productId: randomUUID(), quantity: 1 }] })
        .expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1000 });

      await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(403);
    });
  });

  describe('GET /sales/:id', () => {
    it('retorna 200 com items (e product) e payments para o operador dono da venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1790 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 2 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const response = await request(app.getHttpServer())
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(saleId);
      expect(response.body.data.totalCents).toBe(3580);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].product.id).toBe(prod.id);
      expect(response.body.data.payments).toEqual([]);
    });

    it('devolve 403 quando outro OPERATOR tenta consultar a venda', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const prod = await createTestProduct({ priceCents: 1000 });

      const created = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ items: [{ productId: prod.id, quantity: 1 }] })
        .expect(201);

      const saleId = created.body.data.id as string;
      createdSaleIds.push(saleId);

      const otherOp = await createTestOperator();
      const otherToken = await login(otherOp.email, otherOp.password);

      await request(app.getHttpServer())
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      await request(app.getHttpServer())
        .get(`/sales/${randomUUID()}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('devolve 404 para venda inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .get(`/sales/${randomUUID()}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(404);

      expect(response.body.message).toBe('Venda não encontrada.');
    });

    it('devolve 401 sem token', async () => {
      await request(app.getHttpServer())
        .get(`/sales/${randomUUID()}`)
        .expect(401);
    });
  });
});
