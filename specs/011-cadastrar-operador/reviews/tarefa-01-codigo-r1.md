<Parecer de Código — Tarefa 1>
**Veredito:** APONTAMENTOS

## Apontamentos (bloqueiam)
1. **Teste unitário acoplado a propriedade privada interna do Prisma Client (`_runtimeDataModel`) e instanciando `PrismaClient`/`PrismaPg` fora do `PrismaService`** — `apps/api/src/modules/users/user-created-by.spec.ts:10-49`
   Regra violada: `docs/architecture.md` §2 (linha 51 — suíte unitária do `apps/api` cobre *"services e regras de domínio, sem banco"*, enquanto testes contra o Prisma/banco pertencem ao e2e) e §2.1 ID8 (linha 76 — *"Acesso ao banco só via `PrismaService`"*), além do critério de revisão contra *"teste acoplado a detalhe de implementação, que quebra em qualquer refatoração"*.
   Prejuízo concreto: O teste faz cast inseguro (`as unknown as { _runtimeDataModel: ... }`) para inspecionar `_runtimeDataModel`, uma estrutura interna não documentada do `PrismaClient`, usando `.toEqual(...)` estrito. Qualquer atualização menor do Prisma 7+ que renomeie `_runtimeDataModel` ou adicione metadados aos descritores de campo quebrará o teste unitário sem que a relação `createdBy`/`createdUsers` tenha quebrado. Além disso, o teste instancia `PrismaPg` e `PrismaClient` diretamente dentro de `src/modules/users/` com URL de conexão chumbada (`postgresql://user:pass@localhost:5432/db`) apenas para alcançar esse estado interno, quando a checagem estática de contrato já está coberta por `Prisma.UserScalarFieldEnum` / `expectTypeOf` e a verificação real da relação pertence ao e2e (`apps/api/test/seed.e2e-spec.ts`).

## Sugestões (não bloqueiam)
- Em `apps/api/prisma/schema.prisma:24`, considerar adicionar `@@index([createdById])` no model `User` se futuras consultas listarem operadores filtrando por `createdById` (o PostgreSQL não cria índice automático em colunas FK).
- Se quiser manter um teste unitário leve de contrato do cliente gerado em `apps/api/src/modules/users/user-created-by.spec.ts`, manter apenas as verificações da API pública gerada (`Prisma.UserScalarFieldEnum.createdById` e `expectTypeOf` de `Prisma.UserGetPayload`), removendo a instanciação de `PrismaPg`/`PrismaClient` e a leitura de `_runtimeDataModel`.

## Observações fora do escopo deste diff
- `docs/architecture.md` (§5.1 linha 160 e §5.2 linhas 203-210): o glossário e o diagrama ER ainda listam `User` sem `createdById` (como referência global, pode ser atualizado se desejarem refletir o novo atributo).
- `apps/api/src/modules/auth/auth.service.spec.ts:20-27`: o objeto fake `gerente` ainda não inclui `createdById: null`; compila hoje porque `UsersService` é mockado com `vi.fn()`, mas vale alinhar caso passem a tipar mocks como `User`.
- Execução pendente de e2e: `npm test -w apps/api` (21/21) e `npm run lint -w apps/api` (0 warnings, 0 errors) foram verificados, mas `npm run test:e2e -w apps/api` (que exercita `apps/api/test/seed.e2e-spec.ts` no banco real) não pôde rodar neste ambiente sem PostgreSQL ativo.
</Parecer de Código — Tarefa 1>
