# Parecer de Conformidade — Tarefa 1

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Resumo completo da venda concluída na `CheckoutPage`, sem ação de cancelamento | fora desta tarefa | — |
| CA2 — Tela de pagamento sem ação de concluir sem pagamento `APPROVED` | fora desta tarefa | — |
| CA3 (lado da API) — `POST /sales/:id/cancel` em `OPEN`/`PENDING` do operador autenticado atualiza `Sale` para `CANCELED` (`completedAt` nulo) e `Payment` `PENDING` para `ABANDONED` em `prisma.$transaction` condicional | atendido | `apps/api/src/modules/payments/payment-state-machine.ts:3-27`, `apps/api/src/modules/sales/sales.controller.ts:66-90`, `apps/api/src/modules/sales/sales.service.ts:115-164`, `apps/api/src/modules/sales/sales.service.spec.ts:379-592`, `apps/api/test/sales.e2e-spec.ts:525-620` |
| CA3 (lado da UI) — Polling encerrado, estado "Cancelada — nenhum valor recebido" e botão "Nova venda" | fora desta tarefa | — |
| CA4 — `422` para `COMPLETED` (`"Uma venda concluída não pode ser cancelada."`) e `CANCELED` (`"A venda já está cancelada."`) sem alterar `Sale`/`Payment`, e proteção contra retorno a `COMPLETED` por pagamento posterior ou webhook PIX atrasado | atendido | `apps/api/src/modules/payments/payment-state-machine.ts:14-27`, `apps/api/src/modules/sales/sales.service.ts:130-184`, `apps/api/src/modules/payments/payment-state-machine.spec.ts:9-33`, `apps/api/src/modules/sales/sales.service.spec.ts:499-591`, `apps/api/test/sales.e2e-spec.ts:688-859` |
| CA5 — `403` para `MANAGER` ou outro `OPERATOR` e `404` para venda inexistente em `POST /sales/:id/cancel` | atendido | `apps/api/src/modules/sales/sales.controller.ts:67`, `apps/api/src/modules/sales/sales.service.ts:120-128`, `apps/api/src/modules/sales/sales.service.spec.ts:469-497`, `apps/api/test/sales.e2e-spec.ts:622-686` |
| CA6 — Cancelar montagem de carrinho via `[F8]` com confirmação na UI | fora desta tarefa | — |
| CA7 — Desistência/fechamento/loading/falha de rede na confirmação de cancelamento na UI | fora desta tarefa | — |
| Abandono no meio (lado da API) — Segunda tentativa de cancelamento recebe `422` (`"A venda já está cancelada."`) sem efeito colateral; webhook PIX atrasado após cancelamento não regride `Sale`/`Payment` | atendido | `apps/api/src/modules/sales/sales.service.ts:132-184`, `apps/api/test/sales.e2e-spec.ts:739-859` |

## Apontamentos

*(nenhum apontamento)*

### Evidências de execução
- `cd apps/api; npm test` — 13 arquivos, 179 testes passaram.
- `cd apps/api; npx vitest run --config ./vitest.config.e2e.ts test/sales.e2e-spec.ts` — 1 arquivo, 31 testes passaram.
- `cd apps/api; npm run lint` — 0 warnings, 0 errors.
- Glossário e escopo: apenas os 6 arquivos previstos na Tarefa 1 foram alterados, com termos aderentes ao `docs/architecture.md` e sem comportamento fora da `spec.md`.
