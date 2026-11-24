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
  data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    createdById?: string | null;
  },
) {
  const passwordHash = await argon2.hash(data.password);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      passwordHash,
      role: data.role,
      createdById: data.createdById ?? null,
    },
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      createdById: data.createdById ?? null,
    },
  });
}

// TODO #1: catálogo inicial temporário via seed até existir o cadastro de produtos pela tela do gerente (Issue #1).
const INITIAL_PRODUCTS = [
  { name: 'Café Torrado 500g', barcode: '7891000000011', priceCents: 1890 },
  { name: 'Arroz Tipo 1 5kg', barcode: '7891000000028', priceCents: 2990 },
  { name: 'Feijão Carioca 1kg', barcode: '7891000000035', priceCents: 890 },
  { name: 'Leite Integral 1L', barcode: '7891000000042', priceCents: 549 },
  { name: 'Açúcar Refinado 1kg', barcode: '7891000000059', priceCents: 499 },
] as const;

async function upsertProduct(
  prisma: PrismaClient,
  data: { name: string; barcode: string; priceCents: number },
) {
  return prisma.product.upsert({
    where: { barcode: data.barcode },
    update: {
      name: data.name,
      priceCents: data.priceCents,
      active: true,
    },
    create: {
      name: data.name,
      barcode: data.barcode,
      priceCents: data.priceCents,
      active: true,
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
    const manager = await upsertUser(prisma, {
      name: 'Gerente',
      email: managerEmail,
      password: managerPassword,
      role: Role.MANAGER,
      createdById: null,
    });
    await upsertUser(prisma, {
      name: 'Operador',
      email: operatorEmail,
      password: operatorPassword,
      role: Role.OPERATOR,
      createdById: manager.id,
    });
    for (const product of INITIAL_PRODUCTS) {
      await upsertProduct(prisma, product);
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
