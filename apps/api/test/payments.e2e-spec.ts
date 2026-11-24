import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Role } from '../generated/prisma/enums.js';
import { AppModule } from '../src/app.module.js';

describe('Pagamentos — /payments/config (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const signToken = (role: Role) =>
    jwt.signAsync({ sub: randomUUID(), role });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    jwt = app.get(JwtService);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /payments/config', () => {
    it('devolve 200 apenas com publicKey para OPERATOR autenticado, sem expor segredos', async () => {
      const operatorToken = await signToken(Role.OPERATOR);

      const response = await request(app.getHttpServer())
        .get('/payments/config')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        publicKey: process.env.MP_PUBLIC_KEY,
      });
      expect(Object.keys(response.body.data)).toEqual(['publicKey']);

      const rawBody = JSON.stringify(response.body);
      expect(rawBody).not.toContain(process.env.MP_ACCESS_TOKEN!);
      expect(rawBody).not.toContain(process.env.MP_WEBHOOK_SECRET!);
    });

    it('devolve 401 sem token JWT', async () => {
      await request(app.getHttpServer()).get('/payments/config').expect(401);
    });

    it('devolve 403 para MANAGER', async () => {
      const managerToken = await signToken(Role.MANAGER);

      await request(app.getHttpServer())
        .get('/payments/config')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });
  });
});
