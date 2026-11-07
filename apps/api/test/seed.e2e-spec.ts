import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Seed de acessos (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    execSync('npx prisma db seed', { stdio: 'pipe' });
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  }, 60_000);

  afterAll(async () => {
    await moduleRef.close();
  });

  it.each([
    ['MANAGER', 'SEED_MANAGER_EMAIL', 'SEED_MANAGER_PASSWORD'],
    ['OPERATOR', 'SEED_OPERATOR_EMAIL', 'SEED_OPERATOR_PASSWORD'],
  ] as const)(
    'cria um %s com a senha guardada só como hash',
    async (role, emailVar, passwordVar) => {
      const email = process.env[emailVar]!;
      const password = process.env[passwordVar]!;

      const user = await prisma.user.findUnique({ where: { email } });

      expect(user).not.toBeNull();
      expect(user!.role).toBe(role);
      expect(user!.passwordHash).not.toBe(password);
      expect(await argon2.verify(user!.passwordHash, password)).toBe(true);
    },
  );

  it('rodar o seed de novo não duplica os acessos', async () => {
    execSync('npx prisma db seed', { stdio: 'pipe' });

    const seedEmails = [
      process.env.SEED_MANAGER_EMAIL!,
      process.env.SEED_OPERATOR_EMAIL!,
    ];

    const total = await prisma.user.count({
      where: { email: { in: seedEmails } },
    });

    expect(total).toBe(2);
  }, 60_000);
});
