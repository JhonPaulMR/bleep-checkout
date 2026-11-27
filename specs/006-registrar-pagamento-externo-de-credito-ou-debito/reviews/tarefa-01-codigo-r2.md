<Parecer de Código — Tarefa 1>
**Veredito:** APROVADO

## Resumo da verificação
- **Arquitetura (`docs/architecture.md`):**
  - **ID6 (Camadas):** `PaymentsController` apenas recebe a requisição HTTP e delega ao `PaymentsService`; o service encapsula a regra de negócio sem conhecer `Request`/`Response` e acessa o banco exclusivamente via `PrismaService`.
  - **ID7 (Entrada):** `PayExternalDto` valida estritamente `method` (`EXTERNAL_CREDIT` | `EXTERNAL_DEBIT` via `@IsIn`) e `approved` (`@IsBoolean`), com `ValidationPipe` global rejeitando campos extras e tipos inválidos (coberto em e2e).
  - **ID8 (Dados):** Persistência atômica via `prisma.$transaction`, valor `amountCents` sempre derivado de `sale.totalCents` no servidor (centavos inteiros) e atualização condicional `sale.updateMany({ where: { id, status: OPEN } })` no ramo aprovado, protegendo contra conclusão concorrente/duplo clique.
  - **ID9 (Autenticação e Autorização):** Rota sob `JwtAuthGuard` e `RolesGuard` globais, restrita a `@Roles(Role.OPERATOR)` e com validação de posse da venda (`operatorId === sub`) reutilizando `findOpenOwnedSale`.
  - **ID10 e §2.2 (Contrato e Swagger):** Resposta compatível com `ResponseInterceptor` (`{ data: { payment, sale } }`), exceções de domínio NestJS (`NotFoundException`, `ForbiddenException`, `UnprocessableEntityException`) capturadas pelo `HttpExceptionFilter`, e documentação OpenAPI completa (`@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`).
  - **ID17 e §2 (Segredos, ESM e Testes):** Sem segredos ou URLs hardcoded, imports ESM com `.js`, testes Vitest usando `vi.fn()`.
- **Validação executada:**
  - `cd apps/api; npm test` → **13/13 arquivos, 171/171 testes passaram** (`payments.service.spec.ts`: 36/36).
  - `cd apps/api; npm run lint` → **0 warnings, 0 errors** (oxlint).
  - `cd apps/api; npm run test:e2e` → **`test/payments.e2e-spec.ts`: 51/51 testes passaram** (houve 4 falhas em `customers`, `products` e `users` e2e por colisão de dados no mesmo banco local durante execução concorrente de revisões; sem relação com o diff).

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- Extrair uma constante privada `SALE_DETAILS_INCLUDE` em `apps/api/src/modules/payments/payments.service.ts` para o objeto `{ items: { include: { product: true } }, payments: true, customer: true }`, hoje repetido nos dois ramos de `payExternal` (linhas 316-320 e 331-335) e em `payWithCustomerCredit` (linhas 268-272).
- Em `apps/api/src/modules/payments/payments.service.ts` (linhas 326-359), no ramo `approved: false`, `tx.sale.findFirst` lê o status `OPEN` sem bloqueio de linha; não altera o estado da venda nem saldos (não viola ID8), mas sob concorrência extrema simultânea com uma aprovação poderia registrar um `Payment DECLINED` em paralelo à conclusão.

## Observações fora do escopo deste diff
- `apps/api/src/modules/payments/payments.service.ts` (linhas 183-202): `payWithCustomerCredit` (pré-existente) duplica a validação de venda existente/dono/aberta em vez de reaproveitar `findOpenOwnedSale` e usa a mensagem `"Venda não está aberta para pagamento."` em vez de `"A venda não está aberta para pagamento."`.
- `apps/api/test/{customers,products,users}.e2e-spec.ts`: testes que dependem de contagens exatas ou chaves fixas no banco compartilhado podem colidir se duas execuções de `test:e2e` rodarem em paralelo contra o mesmo PostgreSQL local.
</Parecer de Código — Tarefa 1>
