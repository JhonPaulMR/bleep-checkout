import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Entrar no sistema (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    execSync('npx prisma db seed', { stdio: 'pipe' });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login com o gerente do seed devolve 200, token e papel, sem passwordHash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.SEED_MANAGER_EMAIL,
        password: process.env.SEED_MANAGER_PASSWORD,
      })
      .expect(200);

    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.user).toEqual({
      name: expect.any(String),
      role: 'MANAGER',
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  describe('POST /auth/login com entrada malformada', () => {
    const enviar = (body: Record<string, unknown>) =>
      request(app.getHttpServer()).post('/auth/login').send(body);

    it.each([
      ['e-mail vazio', { email: '', password: 'qualquer-senha' }],
      [
        'e-mail inválido',
        { email: 'nao-e-email', password: 'qualquer-senha' },
      ],
      ['senha vazia', { email: 'ninguem@exemplo.com', password: '' }],
      [
        'campo extra',
        {
          email: 'ninguem@exemplo.com',
          password: 'qualquer-senha',
          role: 'MANAGER',
        },
      ],
    ])('recusa %s com 400 no formato de erro', async (_caso, body) => {
      const response = await enviar(body).expect(400);

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
      expect(response.body.path).toBe('/auth/login');
    });
  });

  describe('POST /auth/login com acesso inválido', () => {
    const recusar = (email: string | undefined, password: string) =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(401);

    it('recusa e-mail inexistente e senha errada com a mesma mensagem, no formato de erro', async () => {
      const emailInexistente = await recusar(
        'ninguem@exemplo.com',
        'qualquer-senha',
      );
      const senhaErrada = await recusar(
        process.env.SEED_MANAGER_EMAIL,
        'senha-errada',
      );

      for (const response of [emailInexistente, senhaErrada]) {
        expect(Object.keys(response.body).sort()).toEqual([
          'error',
          'message',
          'path',
          'statusCode',
          'timestamp',
        ]);
        expect(response.body.statusCode).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
        expect(response.body.message).toBe('E-mail ou senha inválidos.');
        expect(response.body.path).toBe('/auth/login');
        expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
      }
      expect(emailInexistente.body.message).toBe(senhaErrada.body.message);
    });
  });

  describe('GET /auth/me', () => {
    const formatoDeErro = (body: Record<string, unknown>) => {
      expect(Object.keys(body).sort()).toEqual([
        'error',
        'message',
        'path',
        'statusCode',
        'timestamp',
      ]);
      expect(body['statusCode']).toBe(401);
      expect(body['error']).toBe('Unauthorized');
      expect(body['path']).toBe('/auth/me');
    };

    const loginDoGerente = async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.SEED_MANAGER_EMAIL,
          password: process.env.SEED_MANAGER_PASSWORD,
        })
        .expect(200);
      return response.body.data.accessToken as string;
    };

    it('sem token devolve 401 no formato de erro', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      formatoDeErro(response.body);
    });

    it('com token adulterado devolve 401 no formato de erro', async () => {
      const token = await loginDoGerente();
      const adulterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adulterado}`)
        .expect(401);

      formatoDeErro(response.body);
    });

    it('com token vencido devolve 401 no formato de erro', async () => {
      const jwt = new JwtService({ secret: process.env.JWT_SECRET });
      const vencido = await jwt.signAsync(
        { sub: 'qualquer-id', role: 'MANAGER' },
        { expiresIn: -10 },
      );

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);

      formatoDeErro(response.body);
    });

    it('com token de usuário que não existe mais devolve 401', async () => {
      const jwt = new JwtService({ secret: process.env.JWT_SECRET });
      const token = await jwt.signAsync(
        { sub: 'id-que-nao-existe', role: 'MANAGER' },
        { expiresIn: '1h' },
      );

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      formatoDeErro(response.body);
    });

    it('com token válido devolve 200 com nome e papel, sem passwordHash', async () => {
      const token = await loginDoGerente();

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        data: { name: expect.any(String), role: 'MANAGER' },
      });
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });
  });
});
