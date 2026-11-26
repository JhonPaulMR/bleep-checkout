# Parecer de Conformidade — Tarefa 1

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Débito atômico em `prisma.$transaction` via `updateMany` condicional (`balanceCents >= totalCents`), `Payment` (`CUSTOMER_CREDIT`, `APPROVED`), `CreditTransaction` (`SALE_DEBIT`), `Sale` como `COMPLETED` e retorno `201` com novo saldo | atendido | `apps/api/src/modules/payments/payments.controller.ts:107-134`, `apps/api/src/modules/payments/payments.service.ts:182-279`, `apps/api/src/modules/payments/payments.service.spec.ts:505-601`, `apps/api/test/payments.e2e-spec.ts:617-675` |
| CA2 — API recusa saldo insuficiente com `422` (`"Saldo insuficiente."`), mantém venda em `OPEN` e não altera saldo do cliente | atendido | `apps/api/src/modules/payments/payments.service.ts:210-222`, `apps/api/src/modules/payments/payments.service.spec.ts:603-618`, `apps/api/test/payments.e2e-spec.ts:677-703` |
| CA3 — API recusa venda sem cliente vinculado com `422` (`"Selecione um cliente para pagar com crédito."`) | atendido | `apps/api/src/modules/payments/payments.service.ts:201-205`, `apps/api/src/modules/payments/payments.service.spec.ts:620-635`, `apps/api/test/payments.e2e-spec.ts:705-720` |
| CA4 — `POST /sales` segue recusando lista vazia com `400` e `POST /sales/:id/payments/credit` recusa venda que não esteja em `OPEN` com `422` | atendido | `apps/api/src/modules/payments/payments.service.ts:195-199`, `apps/api/src/modules/payments/payments.service.ts:224-239`, `apps/api/src/modules/payments/payments.service.spec.ts:659-688`, `apps/api/test/payments.e2e-spec.ts:722-744`, `apps/api/test/sales.e2e-spec.ts:246-257` |
| CA5 — `POST /sales` aceita `customerId` opcional vinculando o cliente à venda (e valida existência do cliente) | atendido | `apps/api/src/modules/sales/dto/create-sale.dto.ts:34-41`, `apps/api/src/modules/sales/sales.service.ts:42-49`, `apps/api/src/modules/sales/sales.service.ts:83`, `apps/api/src/modules/sales/sales.service.spec.ts:229-312`, `apps/api/test/sales.e2e-spec.ts:329-374` |
| CA6 — `POST /sales/:id/payments/credit` devolve `401` sem token/inválido, `403` para `MANAGER`, `403` para outro `OPERATOR` e `404` para venda inexistente | atendido | `apps/api/src/modules/payments/payments.controller.ts:107-108`, `apps/api/src/modules/payments/payments.service.ts:185-193`, `apps/api/src/modules/payments/payments.service.spec.ts:637-657`, `apps/api/test/payments.e2e-spec.ts:746-798` |
| Abandono no meio (concorrência no débito de saldo) — `updateMany` condicional dentro de `prisma.$transaction` impedindo saldo negativo | atendido | `apps/api/src/modules/payments/payments.service.ts:209-239` |
| CA7 — Expiração de sessão (`401`) e falha de rede no frontend | fora desta tarefa | — |
| CA8 — Fechar modal sem selecionar / trocar forma de pagamento no frontend | fora desta tarefa | — |

## Apontamentos
*(nenhum)*
