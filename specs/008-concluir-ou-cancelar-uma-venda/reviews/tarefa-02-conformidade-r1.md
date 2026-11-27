# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Resumo completo de venda concluída (`COMPLETED`) sem ação de cancelamento | fora desta tarefa | Tarefa 3 |
| CA2 — Ausência de ação para concluir venda `OPEN`/`PENDING` sem pagamento `APPROVED` | fora desta tarefa | Tarefa 3 |
| CA3 (chamada HTTP `POST /sales/:id/cancel` com `encodeURIComponent` desembrulhando `{ data }`) | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:169-173`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:437-456` |
| CA3 (transação atômica na API e fluxo de confirmação/polling/estado na UI) | fora desta tarefa | Tarefa 1 (API) e Tarefa 3 (UI) |
| CA4 — Recusa `422` para `COMPLETED`/`CANCELED` e proteção contra webhook PIX atrasado | fora desta tarefa | Tarefa 1 |
| CA5 — Recusa `403` para `MANAGER` ou outro `OPERATOR` e `404` para venda inexistente | fora desta tarefa | Tarefa 1 |
| CA6 — Cancelamento de carrinho `[F8]` com confirmação explícita e estado desabilitado | fora desta tarefa | Tarefa 3 |
| CA7 — Desistência sem chamada HTTP, desabilitação em carregamento e erro de rede | fora desta tarefa | Tarefa 3 |

## Apontamentos
*(nenhum)*
