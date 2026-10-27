import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../generated/prisma/client.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não definida. Veja apps/api/.env.example.`);
  }
  return value;
}

async function upsertUser(
  prisma: PrismaClient,
  data: { name: string; email: string; password: string; role: Role },
) {
  const passwordHash = await argon2.hash(data.password);
  await prisma.user.upsert({
    where: { email: data.email },
    update: { name: data.name, passwordHash, role: data.role },
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    },
  });
}

async function main() {
  const managerEmail = requireEnv('SEED_MANAGER_EMAIL');
  const managerPassword = requireEnv('SEED_MANAGER_PASSWORD');
  const operatorEmail = requireEnv('SEED_OPERATOR_EMAIL');
  const operatorPassword = requireEnv('SEED_OPERATOR_PASSWORD');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
  });

  try {
    await upsertUser(prisma, {
      name: 'Gerente',
      email: managerEmail,
      password: managerPassword,
      role: Role.MANAGER,
    });
    // TODO #11: o operador inicial some quando existir a tela de cadastro de operadores.
    await upsertUser(prisma, {
      name: 'Operador',
      email: operatorEmail,
      password: operatorPassword,
      role: Role.OPERATOR,
    });
  } finally {
    await prisma.$disconnect();
  }
}

await main();
