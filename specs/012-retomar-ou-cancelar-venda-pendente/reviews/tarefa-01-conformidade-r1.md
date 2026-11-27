<Parecer de Conformidade — Tarefa 1>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (lado da API) — `GET /sales?status=PENDING` lista somente vendas `PENDING` do operador autenticado com `customer`, `items` e `payments` | atendido | `apps/api/src/modules/sales/dto/list-sales-query.dto.ts:5-13`, `apps/api/src/modules/sales/sales.controller.ts:47-67`, `apps/api/src/modules/sales/sales.service.ts:96-105`, `apps/api/src/modules/sales/sales.service.spec.ts:596-632`, `apps/api/test/sales.e2e-spec.ts:844-953` |
| CA2 (lado da API) — `GET /sales?status=PENDING` retorna `[]` quando não há vendas `PENDING` para o operador | atendido | `apps/api/src/modules/sales/sales.service.ts:96-105`, `apps/api/src/modules/sales/sales.service.spec.ts:634-651`, `apps/api/test/sales.e2e-spec.ts:955-966` |
| CA5 (lado da API) — `POST /sales/:id/reopen` transita condicionalmente `Sale` `PENDING → OPEN` e `Payment` `PENDING → ABANDONED` em `prisma.$transaction`, mantendo proteção contra webhook PIX atrasado (`ABANDONED → ∅`) | atendido | `apps/api/src/modules/sales/sales.controller.ts:115-140`, `apps/api/src/modules/sales/sales.service.ts:177-229`, `apps/api/src/modules/sales/sales.service.spec.ts:654-708`, `apps/api/src/modules/sales/sales.service.spec.ts:761-776`, `apps/api/test/sales.e2e-spec.ts:1003-1068`, `apps/api/test/sales.e2e-spec.ts:1236-1314` |
| CA6 — `422` (`"A venda não está pendente para reabertura."`) em `OPEN`/`COMPLETED`/`CANCELED` sem alterar `Sale`/`Payment`; `403` para `MANAGER` em `GET /sales?status=PENDING` e `POST /sales/:id/reopen` e para outro `OPERATOR` em `POST /sales/:id/reopen`; `404` para venda inexistente | atendido | `apps/api/src/modules/sales/sales.controller.ts:47-67`, `apps/api/src/modules/sales/sales.controller.ts:115-140`, `apps/api/src/modules/sales/sales.service.ts:177-229`, `apps/api/src/modules/sales/sales.service.spec.ts:710-760`, `apps/api/test/sales.e2e-spec.ts:975-986`, `apps/api/test/sales.e2e-spec.ts:1076-1234` |
| CA1/CA2 (lado UI), CA3, CA4, CA5 (lado UI), CA7 | fora desta tarefa | Tarefas 2 e 3 do `plan.md` |

## Apontamentos

*(nenhum)*

## Evidência de execução dos testes
- `cd apps/api; npm test` — 13 arquivos, 188 testes passando (incluindo 29 testes em `sales.service.spec.ts`).
- `cd apps/api; npx vitest run --config ./vitest.config.e2e.ts test/sales.e2e-spec.ts` — 43 testes passando.
- `cd apps/api; npm run lint` — 0 warnings, 0 errors.
</Parecer de Conformidade — Tarefa 1>
