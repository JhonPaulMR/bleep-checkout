# Parecer de Código — Tarefa 1

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
*(nenhum)*

## Sugestões (não bloqueiam)
- **`apps/api/src/modules/customers/dto/add-credit.dto.ts:4-8`**: adicionar `minimum: 1` em `@ApiProperty` (seguindo o padrão de `CreateCustomerDto.balanceCents` que declara `minimum: 0`) para refletir o limite `@Min(1)` no schema OpenAPI servido em `/docs`.
- **`apps/api/test/customers.e2e-spec.ts:11`**: atualizar o título do `describe` raiz (`'Clientes — POST /customers e GET /customers (e2e)'`) para refletir que a suíte agora também cobre `POST /customers/:id/credits`.

## Observações fora do escopo deste diff
*(nenhuma)*

---

### Conferência contra `docs/architecture.md`
- **ID6 (Camadas):** `CustomersController` apenas recebe `@Param('id')` e `@Body() dto: AddCreditDto` e delega ao `CustomersService`; `CustomersService` encapsula a regra de negócio e acessa o banco exclusivamente via `PrismaService`.
- **ID7 (Entrada):** `AddCreditDto` usa `class-validator` (`@IsInt()`, `@Min(1)`) e `@ApiProperty`; validado nos testes e2e contra `ValidationPipe` global (incluindo rejeição de campos extras).
- **ID8 (Dados):** atualização de `Customer.balanceCents` via `{ increment: amountCents }` e criação de `CreditTransaction` (`CreditType.TOP_UP`) ocorrem na mesma `prisma.$transaction`, com valores em centavos inteiros (`Int`).
- **ID9 / §2.2 (Autenticação e Contrato):** rota protegida por `JwtAuthGuard` + `RolesGuard` com `@Roles(Role.MANAGER)`, e `@ApiBearerAuth()` / `@ApiOperation` / `@ApiResponse` declarados no controller.
- **ID10 (Resposta e erro):** retorno do cliente atualizado passa pelo `ResponseInterceptor` (`{ data }`), e cliente inexistente lança `NotFoundException('Cliente não encontrado.')`, tratado pelo `HttpExceptionFilter` global (`404`).
- **ID17 (Segredos) e Testes:** nenhum segredo ou URL hardcoded; testes unitários com Vitest (`vi.fn()`) e e2e contra PostgreSQL real cobrem os caminhos de sucesso e erro sem acoplamento frágil.
