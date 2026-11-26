import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Produtos — POST /products e GET /products (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdBarcodes: string[] = [];

  const uniqueBarcode = (suffix: number) =>
    `${Date.now().toString().slice(-9)}${String(suffix).padStart(4, '0')}`;

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.data.accessToken as string;
  };

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
    if (createdBarcodes.length > 0) {
      await prisma.product.deleteMany({
        where: { barcode: { in: createdBarcodes } },
      });
      createdBarcodes.length = 0;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /products como gerente cria produto com active: true (201) e aparece em GET /products do operador', async () => {
    const managerToken = await login(
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_MANAGER_PASSWORD!,
    );
    const operatorToken = await login(
      process.env.SEED_OPERATOR_EMAIL!,
      process.env.SEED_OPERATOR_PASSWORD!,
    );
    const barcode = uniqueBarcode(1);
    createdBarcodes.push(barcode);

    const createResponse = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: '  Café Especial 500g  ',
        barcode,
        priceCents: 2490,
      })
      .expect(201);

    expect(createResponse.body.data).toEqual({
      id: expect.any(String),
      name: 'Café Especial 500g',
      barcode,
      priceCents: 2490,
      active: true,
      createdAt: expect.any(String),
    });

    const listResponse = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);

    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(
      listResponse.body.data.some(
        (p: { barcode: string; active: boolean }) =>
          p.barcode === barcode && p.active === true,
      ),
    ).toBe(true);
  });

  it('POST /products com código de barras duplicado devolve 409 com mensagem exata e não cria duplicata', async () => {
    const managerToken = await login(
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_MANAGER_PASSWORD!,
    );
    const barcode = uniqueBarcode(2);
    createdBarcodes.push(barcode);

    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Produto Original',
        barcode,
        priceCents: 1000,
      })
      .expect(201);

    const dupResponse = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Produto Duplicado',
        barcode,
        priceCents: 1500,
      })
      .expect(409);

    expect(dupResponse.body.statusCode).toBe(409);
    expect(dupResponse.body.error).toBe('Conflict');
    expect(dupResponse.body.message).toBe(
      'Já existe um produto com este código de barras.',
    );
    expect(dupResponse.body.path).toBe('/products');

    const count = await prisma.product.count({ where: { barcode } });
    expect(count).toBe(1);
  });

  describe('POST /products com entrada inválida ou campo extra', () => {
    it.each([
      ['nome vazio', { name: '', barcode: '7891000100103', priceCents: 500 }],
      [
        'nome apenas espaços',
        { name: '   ', barcode: '7891000100103', priceCents: 500 },
      ],
      [
        'barcode com menos de 13 dígitos',
        { name: 'Produto Teste', barcode: '789100010010', priceCents: 500 },
      ],
      [
        'barcode com letras',
        { name: 'Produto Teste', barcode: '789100010010a', priceCents: 500 },
      ],
      [
        'barcode ausente',
        { name: 'Produto Teste', priceCents: 500 },
      ],
      [
        'priceCents zero',
        { name: 'Produto Teste', barcode: '7891000100103', priceCents: 0 },
      ],
      [
        'priceCents negativo',
        { name: 'Produto Teste', barcode: '7891000100103', priceCents: -100 },
      ],
      [
        'priceCents ausente',
        { name: 'Produto Teste', barcode: '7891000100103' },
      ],
      [
        'campo extra active',
        {
          name: 'Produto Teste',
          barcode: '7891000100103',
          priceCents: 500,
          active: false,
        },
      ],
    ])('recusa %s com 400', async (_caso, body) => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(body)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.path).toBe('/products');
    });
  });

  it('POST /products com token de operador devolve 403', async () => {
    const operatorToken = await login(
      process.env.SEED_OPERATOR_EMAIL!,
      process.env.SEED_OPERATOR_PASSWORD!,
    );

    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        name: 'Bloqueado',
        barcode: uniqueBarcode(3),
        priceCents: 500,
      })
      .expect(403);

    expect(response.body.statusCode).toBe(403);
    expect(response.body.path).toBe('/products');
  });

  it('GET /products retorna 200 para MANAGER (catálogo) e OPERATOR (apenas ativos)', async () => {
    const managerToken = await login(
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_MANAGER_PASSWORD!,
    );
    const operatorToken = await login(
      process.env.SEED_OPERATOR_EMAIL!,
      process.env.SEED_OPERATOR_PASSWORD!,
    );
    const inactiveBarcode = uniqueBarcode(4);
    createdBarcodes.push(inactiveBarcode);

    await prisma.product.create({
      data: {
        name: 'Produto Inativo Teste',
        barcode: inactiveBarcode,
        priceCents: 750,
        active: false,
      },
    });

    const managerRes = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(
      managerRes.body.data.some(
        (p: { barcode: string }) => p.barcode === inactiveBarcode,
      ),
    ).toBe(true);

    const operatorRes = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);

    expect(
      operatorRes.body.data.some(
        (p: { barcode: string }) => p.barcode === inactiveBarcode,
      ),
    ).toBe(false);
  });

  describe('POST /products e GET /products sem autenticação válida', () => {
    it('sem token devolve 401 em POST e GET', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({ name: 'X', barcode: '7891000100103', priceCents: 100 })
        .expect(401);

      await request(app.getHttpServer()).get('/products').expect(401);
    });

    it('com token inválido/adulterado devolve 401 em POST e GET', async () => {
      const token = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const adulterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adulterado}`)
        .send({ name: 'X', barcode: '7891000100103', priceCents: 100 })
        .expect(401);

      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${adulterado}`)
        .expect(401);
    });

    it('com token expirado devolve 401 em POST e GET', async () => {
      const jwt = new JwtService({ secret: process.env.JWT_SECRET });
      const vencido = await jwt.signAsync(
        { sub: 'qualquer-id', role: 'MANAGER' },
        { expiresIn: -10 },
      );

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${vencido}`)
        .send({ name: 'X', barcode: '7891000100103', priceCents: 100 })
        .expect(401);

      await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);
    });
  });

  describe('GET /products/barcode/:barcode', () => {
    it('retorna 200 com o produto ativo para OPERATOR', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const barcode = uniqueBarcode(10);
      createdBarcodes.push(barcode);

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Café Torrado 500g',
          barcode,
          priceCents: 1890,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/products/barcode/${barcode}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(res.body.data).toEqual({
        id: expect.any(String),
        name: 'Café Torrado 500g',
        barcode,
        priceCents: 1890,
        active: true,
        createdAt: expect.any(String),
      });
    });

    it('retorna 404 com "Produto não localizado." para código inexistente', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const barcode = uniqueBarcode(11);

      const res = await request(app.getHttpServer())
        .get(`/products/barcode/${barcode}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Produto não localizado.');
      expect(res.body.path).toBe(`/products/barcode/${barcode}`);
    });

    it('retorna 404 com "Produto não localizado." para produto desativado', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const barcode = uniqueBarcode(12);
      createdBarcodes.push(barcode);

      await prisma.product.create({
        data: {
          name: 'Produto Desativado Barcode',
          barcode,
          priceCents: 990,
          active: false,
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/products/barcode/${barcode}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBe('Produto não localizado.');
    });

    it('retorna 403 para MANAGER', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const barcode = uniqueBarcode(13);

      const res = await request(app.getHttpServer())
        .get(`/products/barcode/${barcode}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
    });

    it('retorna 401 sem token ou com token inválido', async () => {
      const barcode = uniqueBarcode(14);

      await request(app.getHttpServer())
        .get(`/products/barcode/${barcode}`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/products/barcode/${barcode}`)
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });
  });

  describe('GET /products?search=<termo>', () => {
    it('filtra por nome case-insensitive retornando apenas ativos para OPERATOR e [] sem correspondência', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );
      const activeBarcode = uniqueBarcode(20);
      const inactiveBarcode = uniqueBarcode(21);
      createdBarcodes.push(activeBarcode, inactiveBarcode);

      await prisma.product.createMany({
        data: [
          {
            name: 'Achocolatado ZxQ9 Ativo',
            barcode: activeBarcode,
            priceCents: 890,
            active: true,
          },
          {
            name: 'Achocolatado ZxQ9 Inativo',
            barcode: inactiveBarcode,
            priceCents: 790,
            active: false,
          },
        ],
      });

      const matchRes = await request(app.getHttpServer())
        .get('/products?search=zxq9')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(matchRes.body.data).toHaveLength(1);
      expect(matchRes.body.data[0].barcode).toBe(activeBarcode);

      const emptyRes = await request(app.getHttpServer())
        .get('/products?search=naoexiste998877')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(emptyRes.body.data).toEqual([]);
    });

    it('permite que MANAGER também filtre por ?search= incluindo inativos', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const activeBarcode = uniqueBarcode(22);
      const inactiveBarcode = uniqueBarcode(23);
      createdBarcodes.push(activeBarcode, inactiveBarcode);

      await prisma.product.createMany({
        data: [
          {
            name: 'Suco Klm8 Ativo',
            barcode: activeBarcode,
            priceCents: 650,
            active: true,
          },
          {
            name: 'Suco Klm8 Inativo',
            barcode: inactiveBarcode,
            priceCents: 550,
            active: false,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/products?search=klm8')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });
  });
});
