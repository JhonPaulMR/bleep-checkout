<Parecer de Código — Tarefa 2>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- Em `apps/api/src/common/guards/roles.guard.ts:20`, `if (!required?.length)` equivaleria a `if (!required || required.length === 0)` com a mesma legibilidade — questão puramente estilística.
- A verificação do diff contra `docs/architecture.md` confirma aderência integral:
  - **Localização e camadas (§3):** `@Roles` em `apps/api/src/common/decorators/roles.decorator.ts` e `RolesGuard` em `apps/api/src/common/guards/roles.guard.ts`, sem acesso direto a banco ou Prisma.
  - **Autenticação e autorização (ID9):** `RolesGuard` registrado globalmente em `apps/api/src/app.module.ts` após `JwtAuthGuard` (garantindo `request.user` já populado na execução dos `APP_GUARD`s) e `@Roles` tipado com o enum `Role` do Prisma (`MANAGER` | `OPERATOR`).
  - **Padrão ESM e testes (§2):** imports relativos com extensão `.js` e testes unitários em Vitest (`vi.fn()`) cobrindo o contrato público de `canActivate` (6 testes passando na suíte de 24/24 em `npm test -w apps/api`).

## Observações fora do escopo deste diff
- Em `apps/api/src/common/guards/jwt-auth.guard.ts:13`, `JwtPayload.role` está tipado como `string` em vez do enum `Role` — não causa erro na comparação atual (`role === userRole`), mas pode ser alinhado em manutenção futura.
- A execução do Vitest em `apps/api` emite aviso de configuração pré-existente sobre o plugin `vite-tsconfig-paths` (Vite já suporta `resolve.tsconfigPaths: true` nativamente).
</Parecer de Código — Tarefa 2>
