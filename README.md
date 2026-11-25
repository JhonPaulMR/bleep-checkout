# Bleep Checkout

Sistema de gerenciamento de produtos, clientes e vendas com um simulador de caixa voltado para operações de balcão.

O Bleep Checkout resolve a necessidade de registrar produtos e clientes, montar uma venda de forma rápida a partir do código de barras ou da busca por nome e registrar pagamentos com PIX, crédito do cliente ou meios processados externamente.

## Autores

- [João Paulo Marques Rodrigues](https://github.com/JhonPaulMR)

## Documentação

- [PRD — requisitos do produto](docs/prd.md)
- [Jornadas de usuário](docs/user-flows.md)
- [Tokens de design](docs/design-tokens.md)
- [Arquitetura](docs/architecture.md)
- [Checklist da disciplina](docs/checklist.md)

## Protótipo

- [Protótipo navegável](https://jhonpaulmr.github.io/bleep-prototipo/) — abre sem login; o botão **Mapa do protótipo** lista todas as telas.

## Stack

- NestJS
- Prisma
- PostgreSQL
- Angular

## Em produção

- **Frontend:** https://bleep-checkout-web.onrender.com
- **API:** https://bleep-checkout.onrender.com
- **Swagger (documentação da API):** https://bleep-checkout.onrender.com/docs

> O plano gratuito do Render hiberna a API após ~15 minutos sem acesso; a primeira requisição após a hibernação pode levar cerca de 1 minuto para acordar o serviço.

## Quick Start

Pré-requisitos: Node.js (com npm) e Docker (com Docker Compose).

1. **Clonar o repositório e instalar dependências** (instala todos os workspaces do monorepo):

   ```bash
   git clone https://github.com/JhonPaulMR/bleep-checkout.git
   cd bleep-checkout
   npm install
   ```

2. **Subir o PostgreSQL local** (inicia o container definido em `docker-compose.yml` com usuário `bleep`, senha `bleep`, banco `bleep_checkout` na porta `5432`):

   ```bash
   docker compose up -d
   ```

3. **Configurar as variáveis de ambiente da API**: copie `apps/api/.env.example` para `apps/api/.env` e preencha `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET`:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   Exemplo para o banco local do passo anterior:

   ```env
   DATABASE_URL="postgresql://bleep:bleep@localhost:5432/bleep_checkout?schema=public"
   DIRECT_URL="postgresql://bleep:bleep@localhost:5432/bleep_checkout?schema=public"
   JWT_SECRET="troque-por-um-segredo-longo-e-aleatorio"
   ```

4. **Aplicar migrations, gerar o Prisma Client e popular o seed** (cria as tabelas, gera a tipagem do Prisma e insere os usuários iniciais configurados em `apps/api/.env`):

   ```bash
   cd apps/api
   npx prisma migrate deploy
   npx prisma generate
   npx prisma db seed
   cd ../..
   ```

5. **Subir a API** (inicia o servidor NestJS em `http://localhost:3000`, com documentação Swagger interativa em `http://localhost:3000/docs`):

   ```bash
   # Modo padrão
   npm run start -w apps/api

   # Ou em modo desenvolvimento (com reload automático)
   npm run start:dev -w apps/api
   ```

6. **Rodar testes e lint** (executa os testes unitários, os testes e2e contra o PostgreSQL local e a análise estática de código):

   ```bash
   npm run test -w apps/api
   npm run test:e2e -w apps/api
   npm run lint -w apps/api
   ```
