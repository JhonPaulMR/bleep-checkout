<Parecer de Conformidade — Tarefa 7>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA9 — Rota `POST /webhooks/mercadopago` marcada com `@Public()`, aceita requisição assinada sem JWT respondendo `200` | atendido | `apps/api/src/modules/webhooks/webhooks.controller.ts:19-21`, `apps/api/test/webhooks.e2e-spec.ts:70-85` |
| CA9 — Rejeição imediata com `401` quando ausente `x-signature`, `x-request-id` ou `data.id` na query string | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:15-38`, `apps/api/src/modules/webhooks/webhook-signature.validator.ts:18-27`, `apps/api/src/modules/webhooks/webhook-signature.validator.spec.ts:73-131`, `apps/api/test/webhooks.e2e-spec.ts:87-135` |
| CA9 — Rejeição com `401` para assinatura HMAC-SHA256 inválida (segredo errado, manifesto adulterado ou header malformado) | atendido | `apps/api/src/modules/webhooks/webhook-signature.validator.ts:29-84`, `apps/api/src/modules/webhooks/webhook-signature.validator.spec.ts:133-209`, `apps/api/test/webhooks.e2e-spec.ts:137-190` |
| CA9 — Comparação em tempo constante com `crypto.timingSafeEqual` após checar tamanho dos buffers | atendido | `apps/api/src/modules/webhooks/webhook-signature.validator.ts:45-51` |
| CA9 — Não consulta o gateway nem altera registros no banco quando a assinatura é rejeitada | atendido | `apps/api/src/modules/webhooks/webhooks.service.ts:12-28`, `apps/api/test/webhooks.e2e-spec.ts:87-190` |
| CA1–CA8, CA10–CA12 | fora desta tarefa | `specs/003-pagar-via-pix/plan.md:64-68` |

## Apontamentos

</Parecer de Conformidade — Tarefa 7>
