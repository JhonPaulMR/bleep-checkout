# Plano — Issue #11

## Decisões técnicas

- **Relação `1:N` no `User` (`schema.prisma`):** acrescentar coluna opcional `createdById String?` com relação autorreferencial `createdBy User? @relation("CreatedUsers", fields: [createdById], references: [id])` e lista inversa `createdUsers User[] @relation("CreatedUsers")`. O campo é opcional (`String?`) porque o gerente inicial nasce via seed sem criador, evitando quebrar linhas já existentes na tabela durante a migration.
- **`RolesGuard` global + `@Roles(...roles: Role[])`:** registrados em `apps/api/src/common/decorators/roles.decorator.ts` e `apps/api/src/common/guards/roles.guard.ts`. O `RolesGuard` entra no `AppModule` como segundo `APP_GUARD`, **sempre depois** do `JwtAuthGuard`, para que `request.user` já esteja preenchido. Comparação estrita (`required.includes(user.role)`): rotas sem `@Roles` permitem qualquer usuário autenticado; rotas com `@Roles(Role.MANAGER)` barram `OPERATOR` com `403 Forbidden` (mesmo princípio para rotas futuras de `OPERATOR` barrando `MANAGER`, conforme RN13).
- **Contrato da API (`UsersController`, `@ApiTags('users')`, `@ApiBearerAuth()`):**
  - `POST /users` — `@Roles(Role.MANAGER)`, corpo `CreateOperatorDto` (`name`, `email`, `password` mínimo 8 caracteres). O `role` é fixado no servidor como `Role.OPERATOR` e `createdById` vem de `request.user.sub`. Retorna `201` com `{ data: { id, name, email, role, createdById, createdAt } }` (nunca devolve `passwordHash`). E-mail já existente → `409 Conflict` ("Já existe um usuário com este e-mail.").
  - `GET /users` — `@Roles(Role.MANAGER)`. Retorna `200` com `{ data: [...] }` contendo os operadores (`role: Role.OPERATOR`) ordenados por `createdAt` descendente, sem `passwordHash`.
  - `GET /users/:id` — acessível a qualquer usuário autenticado (`JwtAuthGuard`), com **regra de dono** no `UsersService`: retorna `200` (sem `passwordHash`) apenas se `requesterId === user.id` ou `user.createdById === requesterId`; caso contrário lança `403 Forbidden`. Se o id não existir, `404 Not Found`.
- **Frontend (`apps/web`):**
  - Nova feature `features/operators/` com `data/operators.service.ts` (único ponto que fala com `/users` e desembrulha `{ data }`) e `pages/operators.page.*` (signals, `@if`/`@for`, Tailwind com design tokens).
  - Rota `/operadores` em `app.routes.ts` protegida por `canMatch: [roleGuard('MANAGER')]`.
  - `Header` (`core/layout/header.ts`) passa a exibir para `MANAGER` os links `Cadastros` (`/cadastros`) e `Operadores` (`/operadores`), mantendo para `OPERATOR` apenas `Caixa` (`/caixa`).

## Tarefas

- [x] **Tarefa 1 — Adicionar relação 1:N `createdById` no `User` com migration**
  - Cobre: pré-requisito de CA6 (passo técnico)
  - Teste primeiro: teste e2e ou unitário verificando que um operador criado com `createdById` aponta para o gerente criador na relação `createdBy` / `createdUsers`; falha porque `createdById` ainda não existe no `schema.prisma`
  - Arquivos previstos: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<timestamp>_add_user_created_by/migration.sql`, `apps/api/prisma/seed.ts`

- [x] **Tarefa 2 — Implementar `RolesGuard` global e decorator `@Roles`**
  - Cobre: CA4 (lado da API — mecanismo de autorização por papel)
  - Teste primeiro: unit do `RolesGuard` (rota sem `@Roles` retorna `true`; rota com `@Roles(Role.MANAGER)` permite `MANAGER` e retorna `false` para `OPERATOR`); falha porque `RolesGuard` e `@Roles` não existem
  - Arquivos previstos: `apps/api/src/common/decorators/roles.decorator.ts`, `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/guards/roles.guard.spec.ts`, `apps/api/src/app.module.ts`

- [x] **Tarefa 3 — Cadastrar operador na API com hash `argon2`, papel fixo e `409` para duplicidade**
  - Cobre: CA1 (lado da API), CA2 (lado da API), CA3 (lado da API), CA4 (`POST /users` → 403), CA5 (`POST /users` → 401)
  - Teste primeiro: unit do `UsersService.createOperator` (hash `argon2`, `role: OPERATOR` fixo, `createdById`, sem `passwordHash`, `409` em e-mail duplicado) e e2e `POST /users` (`201` + login imediato do operador criado, `409` duplicado, `400` entrada inválida ou campo `role` extra, `403` com token de operador, `401` sem token/token adulterado); falham porque DTO, controller e método não existem
  - Arquivos previstos: `apps/api/src/modules/users/dto/create-operator.dto.ts`, `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/users/users.service.spec.ts`, `apps/api/src/modules/users/users.module.ts`, `apps/api/test/users.e2e-spec.ts`

- [x] **Tarefa 4 — Listar operadores e consultar usuário por id com regra de dono na API**
  - Cobre: CA4 (`GET /users` → 403), CA5 (`GET /users` e `GET /users/:id` → 401), CA6 (regra de dono em `GET /users/:id`), CA7 (lado da API — lista vazia)
  - Teste primeiro: unit do `UsersService` (`listOperators` retorna apenas `OPERATOR` sem `passwordHash`; `findByIdForRequester` permite dono/próprio usuário e lança `ForbiddenException` para outro usuário) e e2e `GET /users` e `GET /users/:id` (`200` lista/vazia para gerente, `403` para operador em `GET /users`, `200` para próprio usuário e gerente criador em `GET /users/:id`, `403` para outro usuário autenticado em `GET /users/:id`, `401` sem token); falham porque os endpoints não existem
  - Arquivos previstos: `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/users/users.service.spec.ts`, `apps/api/test/users.e2e-spec.ts`

- [x] **Tarefa 5 — Criar serviço de operadores, rota `/operadores` e menu do gerente no frontend**
  - Cobre: CA4 (lado do front — menu e guard de rota), CA1/CA7 (camada de serviço)
  - Teste primeiro: unit do `OperatorsService` (`list()` e `create()` acessam `/users` e desembrulham `{ data }`), teste do `Header` (gerente vê `Cadastros` e `Operadores`; operador vê só `Caixa`) e teste do `roleGuard` na rota `/operadores` (`OPERATOR` redirecionado para `/caixa`); falham porque serviço, rota e link não existem
  - Arquivos previstos: `apps/web/src/app/features/operators/data/operators.service.ts`, `apps/web/src/app/features/operators/data/operators.service.spec.ts`, `apps/web/src/app/core/layout/header.ts`, `apps/web/src/app/core/layout/header.spec.ts`, `apps/web/src/app/app.routes.ts`

- [x] **Tarefa 6 — Construir tela de listagem e cadastro de operadores com validação no frontend**
  - Cobre: CA1 (lado do front), CA3 (lado do front), CA7 (lado do front)
  - Teste primeiro: unit da `OperatorsPage` (lista vazia exibe mensagem de estado vazio; campos vazios/inválidos bloqueiam envio e mostram erro por campo; envio válido chama `OperatorsService.create`, atualiza a lista e limpa o formulário); falha porque a página não existe
  - Arquivos previstos: `apps/web/src/app/features/operators/pages/operators.page.ts`, `apps/web/src/app/features/operators/pages/operators.page.html`, `apps/web/src/app/features/operators/pages/operators.page.spec.ts`

- [ ] **Tarefa 7 — Tratar conflito 409, sessão expirada 401 e falha de rede na tela de operadores**
  - Cobre: CA2 (lado do front), CA8, CA9
  - Teste primeiro: unit da `OperatorsPage` (`409` exibe "Já existe um usuário com este e-mail." mantendo campos preenchidos; erro de rede exibe "Não foi possível conectar. Tente novamente." mantendo campos e saindo do carregamento; `401` dispara o tratamento do `authInterceptor` levando ao login com mensagem de sessão expirada); falha porque a página não trata esses erros
  - Arquivos previstos: `apps/web/src/app/features/operators/pages/operators.page.ts`, `apps/web/src/app/features/operators/pages/operators.page.html`, `apps/web/src/app/features/operators/pages/operators.page.spec.ts`

## Critérios sem tarefa
