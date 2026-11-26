# Parecer de Código — Tarefa 1 (US02 — Issue #2)

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum apontamento bloqueante encontrado.

Verificações realizadas contra o `docs/architecture.md`:
- **ID6 · Camadas:** `CustomersController` apenas recebe/responde HTTP e delega ao `CustomersService`; `CustomersService` concentra a regra de negócio sem acoplamento a `Request`/`Response` e acessa o banco exclusivamente via `PrismaService`; módulo `CustomersModule` isolado em `apps/api/src/modules/customers` e registrado em `AppModule`.
- **ID7 · Entrada:** `CreateCustomerDto` validado com `class-validator` (`@IsString`, `@IsNotEmpty`, `@Matches`, `@IsInt`, `@Min(0)`) e `class-transformer` (`@Transform`), coberto pelo `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **ID8 · Dados:** Modelos `Customer`, `CreditTransaction`, enum `CreditType` e relação opcional `Sale.customerId` no `schema.prisma` e na migration `20261125195729_create_customers_and_credit_transactions` seguem integralmente o Glossário (§5.1) e o Diagrama ER (§5.2). A criação de `Customer` + `CreditTransaction` (`INITIAL` quando `balanceCents > 0`) roda em `prisma.$transaction`, com dinheiro em centavos inteiros (`Int`).
- **ID9 · Autenticação e Autorização:** Rotas protegidas pelos guards globais `JwtAuthGuard` e `RolesGuard`, sem `@Public()` indevido; `POST /customers` restrito a `@Roles(Role.MANAGER)` e `GET /customers` liberado para `@Roles(Role.MANAGER, Role.OPERATOR)`.
- **ID10 · Resposta e erro:** Respostas usam o `ResponseInterceptor` (`{ data }`) e o `HttpExceptionFilter` globais; conflito de CPF lança `ConflictException` (`409`) tanto na pré-checagem quanto em corrida concorrente (`P2002`), relançando outros erros sem engoli-los.
- **ID14 · Swagger (§2.2):** Controller anotado com `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` e `@ApiResponse`; DTO anotado com `@ApiProperty`.
- **ID17 · Segredos e Testes:** Nenhum segredo hardcoded; testes unitários em Vitest (`vi.fn()`, imports ESM com `.js`) e e2e em Supertest contra PostgreSQL real limpam os dados criados em `afterEach` e validam comportamento, sem acoplamento frágil a implementação interna.

## Sugestões (não bloqueiam)
- **`apps/api/src/modules/customers/dto/create-customer.dto.ts:10-16`:** O `@Transform` com `value.replace(/\D/g, '')` remove qualquer caractere não numérico antes do `@Matches(/^\d{11}$/)`, fazendo com que entradas com letras misturadas (ex.: `"abc12345678901xyz"`) sejam sanitizadas e aceitas. Se quiser restringir a normalização apenas a dígitos e máscara padrão de CPF (`000.000.000-00`), vale validar o padrão antes de remover `.` e `-`.
- **`apps/api/src/modules/customers/customers.service.ts:46-52`:** O tratamento de `P2002` hoje assume que a violação de unicidade na transação é sempre `Customer.cpf` — o que é verdadeiro no estado atual do schema, mas caso outro campo único seja adicionado no futuro, checar o alvo da constraint evita falsos positivos.

## Observações fora do escopo deste diff
- **Erros de domínio vs. `HttpException` direta (ID10):** O `docs/architecture.md` menciona classes próprias para erros de domínio em `common/`, mas o repositório (`UsersService`, `ProductsService` e agora `CustomersService`) utiliza `ConflictException` diretamente do `@nestjs/common`. Candidato a alinhamento documental ou criação de `common/errors` em Issue de manutenção.
- **Helper para `P2002` do Prisma:** A verificação estrutural de `(error as { code?: unknown }).code === 'P2002'` já se repete em `ProductsService` e `CustomersService`; se mais módulos precisarem, vale extrair um utilitário pequeno em `apps/api/src/common/`.
