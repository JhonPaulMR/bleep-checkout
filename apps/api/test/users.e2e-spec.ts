import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Cadastro de operador — POST /users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

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
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: createdEmails } },
      });
      createdEmails.length = 0;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /users como gerente cria operador com papel OPERATOR, sem passwordHash, e permite login imediato', async () => {
    const managerToken = await login(
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_MANAGER_PASSWORD!,
    );
    const email = `operador.novo.${Date.now()}@teste.local`;
    createdEmails.push(email);

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Maria Caixa',
        email,
        password: 'Senha@123',
      })
      .expect(201);

    expect(response.body.data).toEqual({
      id: expect.any(String),
      name: 'Maria Caixa',
      email,
      role: 'OPERATOR',
      createdById: expect.any(String),
      createdAt: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Senha@123' })
      .expect(200);

    expect(loginResponse.body.data.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.data.user).toEqual({
      name: 'Maria Caixa',
      role: 'OPERATOR',
    });
  });

  it.each([
    ['gerente', () => process.env.SEED_MANAGER_EMAIL!],
    ['operador', () => process.env.SEED_OPERATOR_EMAIL!],
  ])(
    'POST /users com e-mail já pertencente a um %s devolve 409 com a mensagem esperada',
    async (_papel, getEmail) => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Duplicado',
          email: getEmail(),
          password: 'Senha@123',
        })
        .expect(409);

      expect(Object.keys(response.body).sort()).toEqual([
        'error',
        'message',
        'path',
        'statusCode',
        'timestamp',
      ]);
      expect(response.body.statusCode).toBe(409);
      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toBe(
        'Já existe um usuário com este e-mail.',
      );
      expect(response.body.path).toBe('/users');
    },
  );

  describe('POST /users com entrada inválida ou campo extra', () => {
    it.each([
      [
        'nome vazio',
        { name: '', email: 'valido@teste.local', password: 'Senha@123' },
      ],
      [
        'nome só espaços',
        { name: '   ', email: 'valido@teste.local', password: 'Senha@123' },
      ],
      [
        'e-mail vazio',
        { name: 'Operador', email: '', password: 'Senha@123' },
      ],
      [
        'e-mail inválido',
        { name: 'Operador', email: 'invalido', password: 'Senha@123' },
      ],
      [
        'senha curta (< 8 caracteres)',
        { name: 'Operador', email: 'valido@teste.local', password: '1234567' },
      ],
      [
        'campo extra role',
        {
          name: 'Operador',
          email: 'valido@teste.local',
          password: 'Senha@123',
          role: 'MANAGER',
        },
      ],
    ])('recusa %s com 400 no formato de erro', async (_caso, body) => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(body)
        .expect(400);

      expect(Object.keys(response.body).sort()).toEqual([
        'error',
        'message',
        'path',
        'statusCode',
        'timestamp',
      ]);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.path).toBe('/users');
    });
  });

  it('POST /users com token de operador devolve 403', async () => {
    const operatorToken = await login(
      process.env.SEED_OPERATOR_EMAIL!,
      process.env.SEED_OPERATOR_PASSWORD!,
    );

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        name: 'Tentativa Operador',
        email: `bloqueado.${Date.now()}@teste.local`,
        password: 'Senha@123',
      })
      .expect(403);

    expect(response.body.statusCode).toBe(403);
    expect(response.body.path).toBe('/users');
  });

  describe('POST /users sem autenticação válida', () => {
    const payload = {
      name: 'Sem Auth',
      email: 'semauth@teste.local',
      password: 'Senha@123',
    };

    it('sem token devolve 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(payload)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users');
    });

    it('com token adulterado devolve 401', async () => {
      const token = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const adulterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adulterado}`)
        .send(payload)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users');
    });

    it('com token expirado devolve 401', async () => {
      const jwt = new JwtService({ secret: process.env.JWT_SECRET });
      const vencido = await jwt.signAsync(
        { sub: 'qualquer-id', role: 'MANAGER' },
        { expiresIn: -10 },
      );

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${vencido}`)
        .send(payload)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users');
    });
  });
});
