</Revisor de Conformidade>
<Parecer de Conformidade — Tarefa 5>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA3 — Cobrança com cartão (`POST /sales/:id/payments/card` sem valor monetário), criação de `Payment` (`CARD`, `amountCents: sale.totalCents`) antes do gateway, cobrança com valor do banco e `external_reference: sale.id`, aprovação atualizando `gatewayPaymentId`, `Payment.status` → `APPROVED` e `Sale.status` → `COMPLETED` (com `completedAt`) em `prisma.$transaction` (lado da API; exibição na tela pertence à Tarefa 9) | atendido | `apps/api/src/modules/payments/dto/pay-with-card.dto.ts:27-54`, `apps/api/src/modules/payments/payments.controller.ts:48-77`, `apps/api/src/modules/payments/payments.service.ts:47-109`, `apps/api/src/modules/payments/payments.service.spec.ts:84-173`, `apps/api/test/payments.e2e-spec.ts:194-244,334-383` |
| CA4 — Resposta `rejected` grava `gatewayPaymentId`, marca `Payment` como `DECLINED`, mantém `Sale.status` em `OPEN` e permite nova tentativa com novo `Payment` e nova `idempotencyKey` (lado da API; mensagem na tela pertence à Tarefa 9) | atendido | `apps/api/src/modules/payments/payments.service.ts:111-127`, `apps/api/src/modules/payments/payments.service.spec.ts:215-254`, `apps/api/test/payments.e2e-spec.ts:246-300` |
| CA5 — Resposta `in_process` ou `pending` grava `gatewayPaymentId`, mantém `Payment.status` em `PENDING` e transiciona `Sale.status` para `PENDING` em `prisma.$transaction` sem marcar como paga (lado da API; mensagem e polling na tela pertencem à Tarefa 9) | atendido | `apps/api/src/modules/payments/payments.service.ts:129-150`, `apps/api/src/modules/payments/payments.service.spec.ts:256-312`, `apps/api/test/payments.e2e-spec.ts:302-332` |
| CA7 (lado da API) — Uso de `idempotencyKey: payment.id` na chamada ao gateway para evitar cobrança duplicada (lado da tela pertence à Tarefa 9) | atendido | `apps/api/src/modules/payments/payments.service.ts:53-77`, `apps/api/src/modules/payments/payments.service.spec.ts:143-153`, `apps/api/test/payments.e2e-spec.ts:226-233,295-299` |
| CA8 (propriedade e papel na cobrança) — `POST /sales/:id/payments/card` exige JWT válido (`401`), bloqueia `MANAGER` (`403`) e bloqueia `OPERATOR` que não é dono da venda (`sale.operatorId !== req.user.sub`, `403`) | atendido | `apps/api/src/modules/payments/payments.controller.ts:48-49`, `apps/api/src/modules/payments/payments.service.ts:41-45`, `apps/api/src/modules/payments/payments.service.spec.ts:326-336`, `apps/api/test/payments.e2e-spec.ts:385-422` |
| CA1, CA2, CA6, CA9, CA10, CA11, CA12 — Demais critérios da spec | fora desta tarefa | — |

## Apontamentos
*(sem apontamentos — testes executados após revisão: `npm test` com 95 testes na API e 50 no Web aprovados; `npm run test:e2e` com 6 arquivos e 80 testes aprovados, incluindo 16 em `apps/api/test/payments.e2e-spec.ts`)*
</Parecer de Conformidade — Tarefa 5>
