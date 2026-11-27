# Parecer de Conformidade — Tarefa 1

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (API) — `POST /sales/:id/payments/external` com `{ method: EXTERNAL_CREDIT \| EXTERNAL_DEBIT, approved: true }` grava `Payment` `APPROVED` com `amountCents: sale.totalCents` e transita `Sale` para `COMPLETED` com `completedAt` em transação atômica | atendido | `apps/api/src/modules/payments/payments.controller.ts:139-170`, `apps/api/src/modules/payments/payments.service.ts:283-324`, `apps/api/src/modules/payments/payments.service.spec.ts:700-772`, `apps/api/test/payments.e2e-spec.ts:803-846` |
| CA2 (API) — `POST /sales/:id/payments/external` com `{ method: EXTERNAL_CREDIT \| EXTERNAL_DEBIT, approved: false }` grava `Payment` `DECLINED` com o `method` escolhido e mantém `Sale` em `OPEN` com `completedAt` nulo | atendido | `apps/api/src/modules/payments/payments.service.ts:326-360`, `apps/api/src/modules/payments/payments.service.spec.ts:774-845`, `apps/api/test/payments.e2e-spec.ts:848-900` |
| CA3 (API) — Payload sem `approved` booleano ou com `method` fora de `EXTERNAL_CREDIT` \| `EXTERNAL_DEBIT` (ou campo extra) é rejeitado com `400` sem criar `Payment` nem alterar `Sale` | atendido | `apps/api/src/modules/payments/dto/pay-external.dto.ts:1-20`, `apps/api/test/payments.e2e-spec.ts:902-951` |
| CA4 — `MANAGER` ou `OPERATOR` diferente do dono da venda recebe `403`; venda inexistente recebe `404` | atendido | `apps/api/src/modules/payments/payments.controller.ts:140`, `apps/api/src/modules/payments/payments.service.ts:284,363-377`, `apps/api/src/modules/payments/payments.service.spec.ts:847-878`, `apps/api/test/payments.e2e-spec.ts:953-1010` |
| CA5 (API) — Venda fora de `OPEN` (`COMPLETED`, `PENDING`, `CANCELED`, inclusive duplo clique/corrida) é recusada com `422` (`"A venda não está aberta para pagamento."`) sem criar novo `Payment` nem alterar a `Sale` | atendido | `apps/api/src/modules/payments/payments.service.ts:284,288-303,326-342,379-383`, `apps/api/src/modules/payments/payments.service.spec.ts:880-938`, `apps/api/test/payments.e2e-spec.ts:1012-1074` |
| CA1/CA2/CA3/CA5 (UI) e CA6 (abandono/rede na UI) | fora desta tarefa | Previstos nas Tarefas 2 e 3 (`plan.md`) |

## Evidências de execução
- `cd apps/api; npm test`: 13 arquivos, 171 testes passaram (incluindo 36 em `payments.service.spec.ts`).
- `cd apps/api; npx vitest run --config ./vitest.config.e2e.ts test/payments.e2e-spec.ts`: 51 testes passaram contra o PostgreSQL real.
- `cd apps/api; npm run lint`: 0 warnings, 0 errors.
- Glossário e escopo: aderentes ao `docs/architecture.md` §5.1 (`Sale`, `Payment`, `EXTERNAL_CREDIT`, `EXTERNAL_DEBIT`, `APPROVED`, `DECLINED`, `OPEN`, `COMPLETED`, `PENDING`, `CANCELED`, `amountCents`, `completedAt`) e estritamente limitados aos 5 arquivos previstos no `plan.md`.

## Apontamentos
*(nenhum)*
