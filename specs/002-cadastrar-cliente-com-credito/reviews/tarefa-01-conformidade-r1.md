# Parecer de Conformidade — Tarefa 1

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (lado da API e transação `INITIAL`: `POST /customers` cria `Customer`, grava `CreditTransaction` `INITIAL` na mesma `prisma.$transaction` apenas quando `balanceCents > 0`, devolve `201` e lista em `GET /customers`) | atendido | `apps/api/prisma/schema.prisma:64-127`, `apps/api/src/modules/customers/customers.controller.ts:19-54`, `apps/api/src/modules/customers/customers.service.ts:12-61`, `apps/api/src/modules/customers/customers.service.spec.ts:46-188`, `apps/api/test/customers.e2e-spec.ts:63-157` |
| CA2 (lado da API: CPF duplicado retorna `409` com mensagem `"Já existe um cliente com este CPF."` e não cria duplicata) | atendido | `apps/api/prisma/schema.prisma:81`, `apps/api/src/modules/customers/customers.service.ts:6-54`, `apps/api/src/modules/customers/customers.service.spec.ts:123-158`, `apps/api/test/customers.e2e-spec.ts:159-194` |
| CA3 (lado da API: `balanceCents < 0` ou inválido retorna `400` e não cria cliente com saldo negativo) | atendido | `apps/api/src/modules/customers/dto/create-customer.dto.ts:24-27`, `apps/api/test/customers.e2e-spec.ts:216-252` |
| CA4 (lado da API: nome vazio/espaços, CPF ausente ou fora de 11 dígitos com normalização de `000.000.000-00`, ou campo extra retorna `400` via `ValidationPipe`) | atendido | `apps/api/src/modules/customers/dto/create-customer.dto.ts:5-28`, `apps/api/test/customers.e2e-spec.ts:75-91`, `apps/api/test/customers.e2e-spec.ts:196-253` |
| CA5 (lado da API: `OPERATOR` recebe `403` em `POST /customers`; `GET /customers` acessível para `MANAGER` e `OPERATOR`) | atendido | `apps/api/src/modules/customers/customers.controller.ts:19-54`, `apps/api/test/customers.e2e-spec.ts:104-124`, `apps/api/test/customers.e2e-spec.ts:255-273` |
| CA6 (sem token, token adulterado ou token expirado retorna `401` em `POST /customers` e `GET /customers`) | atendido | `apps/api/src/modules/customers/customers.controller.ts:14-55`, `apps/api/test/customers.e2e-spec.ts:275-322` |
| CA1 (UI), CA2 (UI), CA3 (UI), CA4 (UI), CA5 (UI), CA7, CA8 (interceptor/UI), CA9, CA10 | fora desta tarefa | — |
| Glossário e modelo de dados (`docs/architecture.md` §5.1–§5.2: `Customer`, `CreditTransaction`, `CreditType`, vínculo opcional em `Sale`) | atendido | `apps/api/prisma/schema.prisma:64-127`, `apps/api/prisma/migrations/20261125195729_create_customers_and_credit_transactions/migration.sql:1-49` |

## Apontamentos

*(Nenhum apontamento. Todos os critérios da Tarefa 1 foram verificados no diff e confirmados com execução real de `npm run test -w apps/api` — 13 arquivos, 142 testes — e `npm run test:e2e -w apps/api -- test/customers.e2e-spec.ts` — 16/16 testes passando.)*
