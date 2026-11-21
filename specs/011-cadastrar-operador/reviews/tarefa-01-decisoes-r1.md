# Decisões — Tarefa 1, rodada 1

| # | Apontamento (resumo) | Parecer | Decisão | Justificativa |
| --- | --- | --- | --- | --- |
| 1 | Teste e2e do seed/migration não rodou (`4 skipped`), sem comprovação em banco real | conformidade | aceito | — |
| 2 | Teste unitário `user-created-by.spec.ts` verifica apenas metadados internos e tipos, não o comportamento pedido | conformidade | aceito | — |
| 3 | Teste unitário acoplado a `_runtimeDataModel` e instanciando `PrismaClient`/`PrismaPg` fora do `PrismaService` | código | aceito | — |
| S1 | *(Sugestão promovida)* Adicionar `@@index([createdById])` no `model User` e remover `_runtimeDataModel`/`PrismaClient` do teste unitário | código | aceito | — |
