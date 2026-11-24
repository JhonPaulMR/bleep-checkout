</Revisor de Conformidade>
<Parecer de Conformidade — Tarefa 8>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA10 — Notificação válida (`type=payment`, `data.id`) consulta `PaymentGateway.getPayment` | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:58-70` |
| CA10 — Confere `external_reference` (`sale.id`) e valor (`transaction_amount` vs `sale.totalCents`) | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:78-118` |
| CA10 — Aplica em `prisma.$transaction` apenas transições permitidas (`PENDING`/`OPEN` → `COMPLETED` em `approved`; `PENDING` → `OPEN` em `rejected`) | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:92-147` |
| CA10 — Ignora transições proibidas (`COMPLETED` recebendo `pending`/`in_process`/`rejected`; `CANCELED` recebendo `approved`) sem alterar a venda e responde `200` | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:120-149` |
| CA11 — Restrição `UNIQUE` (`WebhookEvent.gatewayEventId` e `Payment.gatewayPaymentId`) + guarda da máquina de estados garantem idempotência sem duplicar pagamentos ou efeitos colaterais e respondem `200` (inclusive resposta síncrona `approved` seguida de webhook) | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:63-66,110-173` |
| Testes unitários e e2e provando CA10 e CA11 (executados: API unit 11 arquivos / 123 passed; Web unit 10 arquivos / 50 passed; API e2e sequencial `--fileParallelism=false` 7 arquivos / 100 passed) | atendido | `apps/api/src/modules/webhooks/webhooks.service.spec.ts:107-325`, `apps/api/test/webhooks.e2e-spec.ts:271-585` |

## Apontamentos

</Parecer de Conformidade — Tarefa 8>
