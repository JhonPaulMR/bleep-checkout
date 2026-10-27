# Plano — Issue #10

## Decisões técnicas

- **Entidade nova `User`** (glossário técnico do `docs/architecture.md` §5.1): `id`, `name`, `email` (único), `passwordHash`, `role` (enum `Role`: `MANAGER` | `OPERATOR`), `createdAt`. Primeira migration do projeto.
- **Seed** em `apps/api/prisma/seed.ts`, registrado no `prisma.config.ts`, cria um gerente e um operador com senha em `argon2`. E-mails e senhas vêm de variáveis de ambiente (`SEED_MANAGER_EMAIL`, `SEED_MANAGER_PASSWORD`, `SEED_OPERATOR_EMAIL`, `SEED_OPERATOR_PASSWORD`), com valores de teste só no `.env.example`. Leva o `// TODO #11` da spec.
- **Dependências que entram agora** (todas já previstas no `architecture.md` §2): `@nestjs/jwt`, `argon2`, `class-validator`, `class-transformer`, `@nestjs/swagger` e `tsx` (dev, para rodar o seed).
- **Validação das variáveis no boot (ID17):** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` e `WEB_ORIGIN`. As do Mercado Pago entram com a história de pagamento: exigi-las agora impediria a API de subir.
- **Módulos da API:** `prisma/` (`PrismaService`), `modules/users` (consulta do `User` por e-mail) e `modules/auth` (login, JWT e guard). Em `common/`: `ResponseInterceptor`, `HttpExceptionFilter`, `JwtAuthGuard` global e `@Public()`.
- **Contrato da API:**
  - `POST /auth/login` (`@Public()`), corpo `{ email, password }`. Responde `{ data: { accessToken, user: { name, role } } }`. Acesso inválido → **401** com a mesma `message` para e-mail inexistente e senha errada. Corpo inválido → **400**.
  - `GET /auth/me` (protegida, `@ApiBearerAuth()`) → `{ data: { name, role } }`. É a primeira rota atrás do `JwtAuthGuard`, que prova que token ausente, inválido ou vencido recebe **401**.
- **Validade do token: 12 horas**, o teto da spec (Fora de escopo). A expiração por 30 minutos sem uso é do front, porque é o front que sabe se há uso.
- **`RolesGuard` e `@Roles`** não nascem aqui: nenhuma rota desta história é de um papel só. Nascem com a primeira rota de gerente (#1) e de caixa (#4), já previstas no "Assume que" da spec. A separação por papel nesta história é a das áreas do front (CA4, CA5).
- **Front:** `core/auth` (`AuthService` com o token e o usuário no `sessionStorage`, interceptor que anexa `Authorization: Bearer` e trata 401, guards `canMatch` por papel, controle de inatividade), `core/layout` (cabeçalho com menu por papel), `features/login` (página e `data/login.service.ts`), e duas páginas vazias: `features/products` como área de **Cadastros** (rota `/cadastros`, `// TODO #1`) e `features/checkout` como área do **Caixa** (rota `/caixa`, `// TODO #4`).
- **CORS** liberado só para `WEB_ORIGIN`. O placeholder do Angular (`app.html`) e o `app.spec.ts` que o testa são substituídos. O `GET /` "Hello World" da API e os testes dele saem.

## Tarefas

- [ ] **Tarefa 1 — Guardar acessos no banco com seed inicial**
  - Cobre: pré-requisito de CA1 (passo técnico)
  - Teste primeiro: e2e que, depois do seed, encontra um `User` `MANAGER` e um `OPERATOR` com `passwordHash` diferente da senha em texto; falha porque não há `model` nem seed
  - Arquivos previstos: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/…`, `apps/api/prisma/seed.ts`, `apps/api/prisma.config.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`, `apps/api/src/config/env.validation.ts`, `apps/api/src/app.module.ts`, `apps/api/.env.example`, `apps/api/test/seed.e2e-spec.ts`

- [ ] **Tarefa 2 — Entrar com acesso válido na API**
  - Cobre: CA1 (lado da API)
  - Teste primeiro: unit do `AuthService` (senha correta devolve token com `sub` e `role`) e e2e `POST /auth/login` com o gerente do seed → 200 com `{ data: { accessToken, user: { name, role: "MANAGER" } } }` e sem `passwordHash`; falham porque o módulo não existe
  - Arquivos previstos: `apps/api/src/modules/auth/*`, `apps/api/src/modules/users/*`, `apps/api/src/common/interceptors/response.interceptor.ts`, `apps/api/src/common/decorators/public.decorator.ts`, `apps/api/src/main.ts`, `apps/api/test/auth.e2e-spec.ts`

- [ ] **Tarefa 3 — Recusar acesso inválido sem revelar o motivo na API**
  - Cobre: CA2 (lado da API)
  - Teste primeiro: e2e com e-mail inexistente e com senha errada → os dois 401 com a mesma `message` no formato `{ statusCode, error, message, path, timestamp }`; falha porque não há filtro nem recusa
  - Arquivos previstos: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/common/filters/http-exception.filter.ts`, `apps/api/src/main.ts`, `apps/api/test/auth.e2e-spec.ts`

- [ ] **Tarefa 4 — Rejeitar entrada malformada na API**
  - Cobre: CA3 (lado da API)
  - Teste primeiro: e2e com e-mail vazio, e-mail inválido, senha vazia e campo extra → 400; falha porque não há DTO nem `ValidationPipe`
  - Arquivos previstos: `apps/api/src/modules/auth/dto/login.dto.ts`, `apps/api/src/main.ts` (`ValidationPipe` global e Swagger em `/docs`), `apps/api/test/auth.e2e-spec.ts`

- [ ] **Tarefa 5 — Barrar token ausente ou vencido na API**
  - Cobre: CA6 (lado da API: "nenhuma ação é feita com a sessão vencida")
  - Teste primeiro: e2e `GET /auth/me` sem token, com token adulterado e com token vencido → 401; com token válido → 200 `{ data: { name, role } }`; falha porque não há guard nem rota
  - Arquivos previstos: `apps/api/src/common/guards/jwt-auth.guard.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/app.module.ts`, `apps/api/test/auth.e2e-spec.ts`

- [ ] **Tarefa 6 — Levar cada papel à sua área depois de entrar**
  - Cobre: CA1 (lado do front), CA7
  - Teste primeiro: teste do `AuthService` (guarda token e usuário no `sessionStorage`, nunca no `localStorage`) e da página de login (resposta `MANAGER` navega para `/cadastros`, `OPERATOR` para `/caixa`; o menu mostra só a área do papel); falham porque nada existe
  - Arquivos previstos: `apps/web/src/app/app.config.ts`, `apps/web/src/app/app.routes.ts`, `apps/web/src/app/app.html`, `apps/web/src/app/app.spec.ts`, `apps/web/src/app/core/auth/*`, `apps/web/src/app/core/layout/*`, `apps/web/src/app/features/login/*`, `apps/web/src/app/features/products/pages/*`, `apps/web/src/app/features/checkout/pages/*`, `apps/api/src/main.ts` (CORS)

- [ ] **Tarefa 7 — Validar os campos antes de enviar**
  - Cobre: CA3 (lado do front)
  - Teste primeiro: teste da página de login (campo vazio ou e-mail inválido mostra a mensagem do campo e nenhuma requisição sai); falha porque o formulário não valida
  - Arquivos previstos: `apps/web/src/app/features/login/pages/*`

- [ ] **Tarefa 8 — Avisar falha na entrada mantendo o e-mail**
  - Cobre: CA2 (lado do front), CA8
  - Teste primeiro: teste da página de login (resposta 401 mostra "E-mail ou senha inválidos."; erro de rede mostra "Não foi possível conectar. Tente novamente."; nos dois casos o e-mail continua preenchido e o botão sai do carregamento); falha porque a página não trata erro
  - Arquivos previstos: `apps/web/src/app/features/login/pages/*`, `apps/web/src/app/features/login/data/login.service.ts`

- [ ] **Tarefa 9 — Impedir a área do outro papel**
  - Cobre: CA4, CA5
  - Teste primeiro: teste dos guards `canMatch` (operador em `/cadastros` é desviado para `/caixa`; gerente em `/caixa` é desviado para `/cadastros`; sem sessão, os dois vão para o login); falha porque as rotas não têm guard
  - Arquivos previstos: `apps/web/src/app/core/auth/role.guard.ts`, `apps/web/src/app/app.routes.ts`

- [ ] **Tarefa 10 — Encerrar a sessão depois de 30 minutos sem uso**
  - Cobre: CA6 (lado do front)
  - Teste primeiro: teste com relógio simulado (sem uso por 30 min → sessão limpa e login com "Sua sessão expirou. Entre novamente."; uso antes dos 30 min reinicia o prazo; resposta 401 da API também limpa a sessão e leva ao login com a mesma mensagem); falha porque não há controle de inatividade
  - Arquivos previstos: `apps/web/src/app/core/auth/idle-session.service.ts`, `apps/web/src/app/core/auth/auth.interceptor.ts`, `apps/web/src/app/features/login/pages/*`

## Critérios sem tarefa

