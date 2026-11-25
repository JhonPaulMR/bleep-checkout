# Plano — Issue #2

## Decisões técnicas

- **Banco de dados (`apps/api/prisma/schema.prisma` + migration):**
  - Adicionar enum `CreditType` (`INITIAL`, `TOP_UP`, `SALE_DEBIT`), model `Customer` (`id`, `name`, `cpf` `@unique`, `balanceCents` `Int`, `createdAt`, `sales Sale[]`, `creditTransactions CreditTransaction[]`), model `CreditTransaction` (`id`, `customerId`, `saleId?`, `type`, `amountCents`, `createdAt`) e relação opcional `customerId String?` + `customer Customer?` em `Sale` (conforme `docs/architecture.md` §5.1 e §5.2).
  - Gerar migration (`create_customers_and_credit_transactions`) e regenerar o Prisma Client.
- **API (`apps/api/src/modules/customers/`):**
  - `POST /customers` — `@Roles(Role.MANAGER)`, corpo validado por `CreateCustomerDto` (`name`: string não vazia após `trim()`, `cpf`: string normalizada removendo pontuação para exatamente 11 dígitos numéricos `/^\d{11}$/`, `balanceCents`: inteiro `>= 0` com `@IsInt() @Min(0)`).
  - Em `CustomersService.create`: dentro de `prisma.$transaction`, cria o `Customer` e, se `balanceCents > 0`, cria `CreditTransaction` (`type: CreditType.INITIAL`, `amountCents: balanceCents`). Pré-checagem por `cpf` + tratamento de `P2002` lançam `ConflictException('Já existe um cliente com este CPF.')` (`409`). Retorna `201` embrulhado em `{ data }`.
  - `GET /customers` — `@Roles(Role.MANAGER, Role.OPERATOR)`, retorna `200` com `{ data: [...] }` ordenado por `name: 'asc'`.
  - Registrar `CustomersModule` no `AppModule` e documentar rotas e DTO no Swagger (`@ApiTags('customers')`, `@ApiBearerAuth()`, `@ApiProperty`).
- **Frontend (`apps/web`):**
  - Criar `apps/web/src/app/features/customers/data/customers.service.ts` (`list()` e `create(payload)`, desembrulhando `{ data }`).
  - Atualizar `Header` (`apps/web/src/app/core/layout/header.ts`) para incluir **Clientes** (`/clientes`) no menu do `MANAGER` (entre **Produtos** e **Operadores**), mantendo `OPERATOR` apenas com **Caixa**.
  - Adicionar rota `/clientes` em `app.routes.ts` protegida por `canMatch: [roleGuard('MANAGER')]` com testes em `role.guard.spec.ts`.
  - Construir `CustomersPage` (`apps/web/src/app/features/customers/pages/customers.page.*`) fiel ao protótipo `clientes.html` (usando apenas tokens semânticos de `styles.css`, signals e `@if`/`@for`): cabeçalho + botão `+ Novo Cliente`, 3 cards de resumo (`Total em Créditos Ativos`, `Base Cadastrada`, `Clientes com Saldo Positivo`), busca local por nome ou CPF, tabela responsiva + cards mobile, `listError`, estado vazio, botão `+ Adicionar crédito` desabilitado (`// TODO #13`), e modal **Cadastrar Cliente** com validação inline e tratamento de `409`, `401` e falha de rede.

## Tarefas

- [ ] **Tarefa 1 — Criar migration de `Customer`/`CreditTransaction` e implementar `POST/GET /customers` na API (unit + e2e)**
  - Cobre: CA1 (lado da API e transação `INITIAL`), CA2 (lado da API), CA3 (lado da API), CA4 (lado da API), CA5 (lado da API), CA6
  - Teste primeiro: testes unitários em `customers.service.spec.ts` (criação com `balanceCents > 0` gravando `CreditTransaction(INITIAL)` na mesma transação; criação com `balanceCents === 0` sem transação; conflito `409` com mensagem exata em CPF duplicado; listagem ordenada por nome) e testes e2e em `apps/api/test/customers.e2e-spec.ts` (`POST /customers` `201` para `MANAGER` com `balanceCents > 0` e `0` + visível em `GET /customers` para `MANAGER` e `OPERATOR`; `409` CPF duplicado; `400` para saldo negativo, nome vazio, CPF inválido ou campo extra; `403` para `OPERATOR` em `POST /customers`; `401` sem token/token inválido em `POST` e `GET`); falham porque schema/módulo ainda não existem
  - Arquivos previstos: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<timestamp>_create_customers_and_credit_transactions/migration.sql`, `apps/api/src/modules/customers/dto/create-customer.dto.ts`, `apps/api/src/modules/customers/customers.service.ts`, `apps/api/src/modules/customers/customers.service.spec.ts`, `apps/api/src/modules/customers/customers.controller.ts`, `apps/api/src/modules/customers/customers.module.ts`, `apps/api/src/app.module.ts`, `apps/api/test/customers.e2e-spec.ts`

- [ ] **Tarefa 2 — Criar `CustomersService`, adicionar link Clientes no `Header` e configurar rota `/clientes` com testes**
  - Cobre: CA5 (lado do front — menu por papel e proteção da rota `/clientes`), CA1 (camada de serviço)
  - Teste primeiro: testes unitários em `customers.service.spec.ts` (`list()` faz `GET /customers` e `create()` faz `POST /customers` desembrulhando `{ data }`), atualização de `header.spec.ts` (gerente vê **Produtos**, **Clientes** e **Operadores**; operador vê apenas **Caixa** e não vê **Clientes**) e bloco `describe('rota /clientes', ...)` em `role.guard.spec.ts` (`MANAGER` acessa `/clientes`, `OPERATOR` redireciona para `/caixa`, anônimo redireciona para `/login`); falham porque serviço, link e rota ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/customers/data/customers.service.ts`, `apps/web/src/app/features/customers/data/customers.service.spec.ts`, `apps/web/src/app/features/customers/pages/customers.page.ts`, `apps/web/src/app/core/layout/header.ts`, `apps/web/src/app/core/layout/header.spec.ts`, `apps/web/src/app/app.routes.ts`, `apps/web/src/app/core/auth/role.guard.spec.ts`

- [ ] **Tarefa 3 — Construir tela de Clientes (cards de resumo, busca local, tabela responsiva, `listError` e estado vazio) fiel ao protótipo**
  - Cobre: CA1 (listagem e layout da tela), CA7 (estado vazio e busca sem resultados), CA9 (falha de rede na listagem via `listError`)
  - Teste primeiro: testes unitários em `customers.page.spec.ts` verificando renderização da tabela com CPF formatado e saldo em BRL, 3 cards de resumo calculados em tempo real, busca local por nome ou CPF (com ou sem pontuação), estado vazio de catálogo e de busca mantendo `+ Novo Cliente` disponível, erro de listagem exibindo `"Não foi possível conectar. Tente novamente."` em `[role="alert"]`, e botão `+ Adicionar crédito` desabilitado (`// TODO #13`); falham porque `CustomersPage` ainda é um placeholder
  - Arquivos previstos: `apps/web/src/app/features/customers/pages/customers.page.ts`, `apps/web/src/app/features/customers/pages/customers.page.html`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts`

- [ ] **Tarefa 4 — Implementar modal "Cadastrar Cliente" com validação inline (nome, CPF, saldo >= 0), envio e cancelamento sem persistir**
  - Cobre: CA1 (cadastro pela interface), CA3 (saldo negativo bloqueado na tela), CA4 (validação inline de nome/CPF), CA10 (cancelamento sem persistir)
  - Teste primeiro: testes unitários em `customers.page.spec.ts` verificando abertura e cancelamento do modal sem chamar `CustomersService.create`, validação inline bloqueando nome vazio, CPF inválido e saldo negativo/inválido (mas aceitando `0,00`), e envio válido normalizando CPF para 11 dígitos e convertendo saldo para `balanceCents`, atualizando lista/cards e fechando o modal; falham porque o modal ainda não existe
  - Arquivos previstos: `apps/web/src/app/features/customers/pages/customers.page.ts`, `apps/web/src/app/features/customers/pages/customers.page.html`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts`

- [ ] **Tarefa 5 — Tratar conflito `409` (CPF duplicado), sessão expirada `401` e falha de rede no modal de Clientes**
  - Cobre: CA2 (lado do front), CA8, CA9 (cadastro)
  - Teste primeiro: testes unitários em `customers.page.spec.ts` verificando que `409` destaca o campo CPF em `perigo` com `"Já existe um cliente com este CPF."` mantendo campos preenchidos e limpando o erro ao editar CPF, falha de rede exibe `"Não foi possível conectar. Tente novamente."` mantendo campos e saindo do carregamento, e teste integrado com `authInterceptor` + `HttpTestingController` provando que `401` limpa a sessão, redireciona para `/login` com aviso de sessão expirada e não adiciona cliente; falham porque esses tratamentos ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/customers/pages/customers.page.ts`, `apps/web/src/app/features/customers/pages/customers.page.html`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts`

## Critérios sem tarefa
