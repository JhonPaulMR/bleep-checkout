import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
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

  describe('Listagem de operadores — GET /users', () => {
    it('GET /users como gerente devolve 200 com operadores ordenados por createdAt desc e sem passwordHash', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const email = `operador.lista.${Date.now()}@teste.local`;
      createdEmails.push(email);

      const created = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Ana Lista',
          email,
          password: 'Senha@123',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data[0].id).toBe(created.body.data.id);
      for (const user of response.body.data) {
        expect(user.role).toBe('OPERATOR');
        expect(user).not.toHaveProperty('passwordHash');
      }
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('GET /users como gerente devolve 200 com lista vazia quando não há operadores', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const existingOperators = await prisma.user.findMany({
        where: { role: 'OPERATOR' },
      });

      try {
        await prisma.user.deleteMany({ where: { role: 'OPERATOR' } });

        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        expect(response.body.data).toEqual([]);
      } finally {
        if (existingOperators.length > 0) {
          await prisma.user.createMany({ data: existingOperators });
        }
      }
    });

    it('GET /users com token de operador devolve 403', async () => {
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.path).toBe('/users');
    });

    it('GET /users sem token devolve 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users');
    });

    it('GET /users com token adulterado devolve 401', async () => {
      const token = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const adulterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adulterado}`)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users');
    });

    it('GET /users com token expirado devolve 401', async () => {
      const jwt = new JwtService({ secret: process.env.JWT_SECRET });
      const vencido = await jwt.signAsync(
        { sub: 'qualquer-id', role: 'MANAGER' },
        { expiresIn: -10 },
      );

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users');
    });
  });

  describe('Consulta de usuário por id — GET /users/:id', () => {
    it('GET /users/:id devolve 200 sem passwordHash para o próprio usuário (operador)', async () => {
      const operator = await prisma.user.findUniqueOrThrow({
        where: { email: process.env.SEED_OPERATOR_EMAIL! },
      });
      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .get(`/users/${operator.id}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: 'OPERATOR',
        createdById: operator.createdById,
        createdAt: operator.createdAt.toISOString(),
      });
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('GET /users/:id devolve 200 sem passwordHash para o gerente criador do operador', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const email = `operador.dono.${Date.now()}@teste.local`;
      createdEmails.push(email);

      const created = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Pedro Dono',
          email,
          password: 'Senha@123',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/users/${created.body.data.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.data).toEqual(created.body.data);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('GET /users/:id devolve 403 quando um operador tenta consultar o gerente ou outro operador', async () => {
      const manager = await prisma.user.findUniqueOrThrow({
        where: { email: process.env.SEED_MANAGER_EMAIL! },
      });
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const otherOpEmail = `operador.outro.${Date.now()}@teste.local`;
      createdEmails.push(otherOpEmail);

      const otherOp = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Outro Operador',
          email: otherOpEmail,
          password: 'Senha@123',
        })
        .expect(201);

      const operatorToken = await login(
        process.env.SEED_OPERATOR_EMAIL!,
        process.env.SEED_OPERATOR_PASSWORD!,
      );

      const vsManager = await request(app.getHttpServer())
        .get(`/users/${manager.id}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
      expect(vsManager.body.statusCode).toBe(403);

      const vsOtherOp = await request(app.getHttpServer())
        .get(`/users/${otherOp.body.data.id}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
      expect(vsOtherOp.body.statusCode).toBe(403);
    });

    it('GET /users/:id devolve 403 quando outro gerente que não cadastrou o operador tenta consultá-lo', async () => {
      const operator = await prisma.user.findUniqueOrThrow({
        where: { email: process.env.SEED_OPERATOR_EMAIL! },
      });
      const otherManagerEmail = `gerente.outro.${Date.now()}@teste.local`;
      createdEmails.push(otherManagerEmail);

      await prisma.user.create({
        data: {
          name: 'Outro Gerente',
          email: otherManagerEmail,
          passwordHash: await argon2.hash('Senha@123'),
          role: 'MANAGER',
        },
      });

      const otherManagerToken = await login(otherManagerEmail, 'Senha@123');

      const response = await request(app.getHttpServer())
        .get(`/users/${operator.id}`)
        .set('Authorization', `Bearer ${otherManagerToken}`)
        .expect(403);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.path).toBe(`/users/${operator.id}`);
    });

    it('GET /users/:id devolve 404 para id inexistente', async () => {
      const managerToken = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );

      const response = await request(app.getHttpServer())
        .get('/users/id-inexistente')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.path).toBe('/users/id-inexistente');
    });

    it('GET /users/:id sem token devolve 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/qualquer-id')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users/qualquer-id');
    });

    it('GET /users/:id com token adulterado devolve 401', async () => {
      const token = await login(
        process.env.SEED_MANAGER_EMAIL!,
        process.env.SEED_MANAGER_PASSWORD!,
      );
      const adulterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      const response = await request(app.getHttpServer())
        .get('/users/qualquer-id')
        .set('Authorization', `Bearer ${adulterado}`)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users/qualquer-id');
    });

    it('GET /users/:id com token expirado devolve 401', async () => {
      const jwt = new JwtService({ secret: process.env.JWT_SECRET });
      const vencido = await jwt.signAsync(
        { sub: 'qualquer-id', role: 'MANAGER' },
        { expiresIn: -10 },
      );

      const response = await request(app.getHttpServer())
        .get('/users/qualquer-id')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.path).toBe('/users/qualquer-id');
    });
  });
});
