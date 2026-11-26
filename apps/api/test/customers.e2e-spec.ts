import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CreditType } from '../generated/prisma/enums.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Clientes — POST /customers e GET /customers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdCpfs: string[] = [];

  const uniqueCpf = (suffix: number) =>
    `${Date.now().toString().slice(-7)}${String(suffix).padStart(4, '0')}`;

  const formatCpf = (cpf: string) =>
    `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;

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
    if (createdCpfs.length > 0) {
      const customers = await prisma.customer.findMany({
        where: { cpf: { in: createdCpfs } },
        select: { id: true },
      });
      const customerIds = customers.map((c) => c.id);
      if (customerIds.length > 0) {
        await prisma.creditTransaction.deleteMany({
          where: { customerId: { in: customerIds } },
        });
        await prisma.customer.deleteMany({
          where: { id: { in: customerIds } },
        });
      }
      createdCpfs.length = 0;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /customers como gerente cria cliente com balanceCents > 0, grava CreditTransaction INITIAL e aparece em GET /customers para MANAGER e OPERATOR', async () => {
    const managerToken = await login(
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_MANAGER_PASSWORD!,
    );
    const operatorToken = await login(
      process.env.SEED_OPERATOR_EMAIL!,
      process.env.SEED_OPERATOR_PASSWORD!,
    );
    const cpf = uniqueCpf(1);
    createdCpfs.push(cpf);

    const createResponse = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: '  Maria Clara  ',
        cpf: formatCpf(cpf),
        balanceCents: 15000,
      })
      .expect(201);

    expect(createResponse.body.data).toEqual({
      id: expect.any(String),
      name: 'Maria Clara',
      cpf,
      balanceCents: 15000,
      createdAt: expect.any(String),
    });

    const transactions = await prisma.creditTransaction.findMany({
      where: { customerId: createResponse.body.data.id },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      customerId: createResponse.body.data.id,
      saleId: null,
      type: CreditType.INITIAL,
      amountCents: 15000,
    });

    const managerList = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(Array.isArray(managerList.body.data)).toBe(true);
    expect(
      managerList.body.data.some(
        (c: { cpf: string; balanceCents: number }) =>
          c.cpf === cpf && c.balanceCents === 15000,
      ),
    ).toBe(true);

    const operatorList = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);

    expect(
      operatorList.body.data.some((c: { cpf: string }) => c.cpf === cpf),
    ).toBe(true);
  });

  it('POST /customers com balanceCents === 0 cria cliente sem gravar CreditTransaction', async () => {
    const managerToken = await login(
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_MANAGER_PASSWORD!,
    );
    const cpf = uniqueCpf(2);
    createdCpfs.push(cpf);

    const createResponse = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Carlos Eduardo',
        cpf,
        balanceCents: 0,
      })
      .expect(201);

    expect(createResponse.body.data).toEqual({
      id: expect.any(String),
      name: 'Carlos Eduardo',
      cpf,
      balanceCents: 0,
      createdAt: expect.any(String),
    });

    const transactions = await prisma.creditTransaction.findMany({
      where: { customerId: createResponse.body.data.id },
    });
    expect(transactions).toHaveLength(0);
  });

  it('POST /customers com CPF duplicado devolve 409 com mensagem exata e não cria duplicata', async () => {
    const managerToken = await login(
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_MANAGER_PASSWORD!,
    );
    const cpf = uniqueCpf(3);
    createdCpfs.push(cpf);

    await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Cliente Original',
        cpf,
        balanceCents: 1000,
      })
      .expect(201);

    const dupResponse = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Cliente Duplicado',
        cpf: formatCpf(cpf),
        balanceCents: 2000,
      })
      .expect(409);

    expect(dupResponse.body.statusCode).toBe(409);
    expect(dupResponse.body.error).toBe('Conflict');
    expect(dupResponse.body.message).toBe('Já existe um cliente com este CPF.');
    expect(dupResponse.body.path).toBe('/customers');

    const count = await prisma.customer.count({ where: { cpf } });
    expect(count).toBe(1);
  });

  describe('POST /customers com entrada inválida ou campo extra', () => {
    it.each([
      ['nome vazio', { name: '', cpf: '12345678901', balanceCents: 0 }],
      [
        'nome apenas espaços',
        { name: '   ', cpf: '12345678901', balanceCents: 0 },
      ],
      [
        'cpf com menos de 11 dígitos',
        { name: 'Cliente Teste', cpf: '1234567890', balanceCents: 0 },
      ],
      [
        'cpf com mais de 11 dígitos',
        { name: 'Cliente Teste', cpf: '123456789012', balanceCents: 0 },
      ],
      [
        'cpf ausente',
        { name: 'Cliente Teste', balanceCents: 0 },
      ],
      [
        'balanceCents negativo',
        { name: 'Cliente Teste', cpf: '12345678901', balanceCents: -100 },
      ],
      [
        'balanceCents não inteiro',
        { name: 'Cliente Teste', cpf: '12345678901', balanceCents: 10.5 },
      ],
      [
        'balanceCents ausente',
        { name: 'Cliente Teste', cpf: '12345678901' },
      ],
      [
        'campo extra não permitido',
        {
          name: 'Cliente Teste',
          cpf: '12345678901',
          balanceCents: 0,
          extraField: true,
        },
      ],
    ])('recusa %s com 400', async (_caso, body) => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(body)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.path).toBe('/customers');
    });
  });

  it('POST /customers com token de operador devolve 403', async () => {
    const operatorToken = await login(
      process.env.SEED_OPERATOR_EMAIL!,
      process.env.SEED_OPERATOR_PASSWORD!,
    );

    const response = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        name: 'Bloqueado',
        cpf: uniqueCpf(4),
        balanceCents: 500,
      })
      .expect(403);

    expect(response.body.statusCode).toBe(403);
    expect(response.body.path).toBe('/customers');
  });

  describe('POST /customers e GET /customers sem autenticação válida', () => {
    it('sem token devolve 401 em POST e GET', async () => {
      await request(app.getHttpServer())
        .post('/customers')
        .send({ name: 'X', cpf: '12345678901', balanceCents: 100 })
        .expect(401);

      await request(app.getHttpServer()).get('/customers').expect(401);
    });

    it('com token inválido/adulterado devolve 401 em POST e GET', async () => {
      const token = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const adulterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adulterado}`)
        .send({ name: 'X', cpf: '12345678901', balanceCents: 100 })
        .expect(401);

      await request(app.getHttpServer())
        .get('/customers')
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
        .post('/customers')
        .set('Authorization', `Bearer ${vencido}`)
        .send({ name: 'X', cpf: '12345678901', balanceCents: 100 })
        .expect(401);

      await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);
    });
  });
});
