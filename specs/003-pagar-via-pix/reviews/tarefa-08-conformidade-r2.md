</Revisor de Conformidade>
<Parecer de Conformidade — Tarefa 8>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA10 — Notificação assinada (`type=payment` e `data.id`) consulta diretamente o gateway (`PaymentGateway.getPayment`), tratando 404 sem erro e relançando erros transitórios antes de persistir `WebhookEvent` | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:47-82` |
| CA10 — Confere `external_reference` (`sale.id` e `payment.saleId`) e valor (`transaction_amount` compatível com `sale.totalCents`) | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:96-141` |
| CA10 — Aplica dentro de `prisma.$transaction` apenas transições permitidas pela máquina de estados (`PENDING`/`OPEN` → `COMPLETED` em `approved`; `PENDING` → `OPEN` em `rejected`; `OPEN` → `PENDING` em `pending`/`in_process`) | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:85,150-183,195-217` |
| CA10 — Ignora transições proibidas (`COMPLETED` recebendo `pending`/`in_process`/`rejected`; `CANCELED` recebendo `approved`; pagamento já `DECLINED` não regride venda `PENDING` para `OPEN`) sem alterar a venda e responde `200` | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:143-183` |
| CA11 — Restrição `UNIQUE` (`WebhookEvent.gatewayEventId` e `Payment.gatewayPaymentId`) + guarda da máquina de estados + `updateMany` condicional garantem idempotência (repetições, concorrência e resposta síncrona `approved` seguida de webhook) sem duplicar pagamentos nem efeitos colaterais, respondendo `200` | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:64-69,86-94,127-188` |
| Testes unitários e e2e cobrindo CA10 e CA11 (executados: API unit 11 arquivos / 132 passed com 22 em `webhooks.service.spec.ts`; API lint 0 warnings / 0 errors; API e2e `--fileParallelism=false` 7 arquivos / 104 passed com 18 em `webhooks.e2e-spec.ts`) | atendido | `apps/api/src/modules/webhooks/webhooks.service.spec.ts:109-475`, `apps/api/test/webhooks.e2e-spec.ts:271-758` |

## Apontamentos

</Parecer de Conformidade — Tarefa 8>
