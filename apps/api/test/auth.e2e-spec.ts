import 'dotenv/config';
import { execSync } from 'node:child_process';
import { INestApplication } from '@nestjs/common';
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
});
