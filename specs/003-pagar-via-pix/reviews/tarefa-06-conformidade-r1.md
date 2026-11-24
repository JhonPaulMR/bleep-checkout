</Revisor de Conformidade>
<Parecer de Conformidade — Tarefa 6>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA6 (lado da API) — `POST /sales/:id/payments/pix` cria `Payment` (`method: PIX`, `status: PENDING`, `amountCents: sale.totalCents`) antes do gateway, envia valor do banco, `external_reference: sale.id` e `idempotencyKey: payment.id`, grava `gatewayPaymentId` e `qrCode`, transiciona `Sale.status` para `PENDING` em `prisma.$transaction` e nunca marca a venda como paga (`COMPLETED`) | atendido | `apps/api/src/modules/payments/payments.controller.ts:79-106`, `apps/api/src/modules/payments/payments.service.ts:134-179`, `apps/api/src/modules/payments/payments.service.spec.ts:354-444`, `apps/api/test/payments.e2e-spec.ts:442-503` |
| CA6 (lado da tela) — apresentação do QR Code na tela e comportamento de abandono na UI | fora desta tarefa (Tarefa 9) | `specs/003-pagar-via-pix/plan.md:76-80` |
| CA8 (propriedade e papel no PIX) — `POST /sales/:id/payments/pix` devolve `401` sem JWT válido, `403` para `MANAGER` (RN13) e `403` quando `OPERATOR` tenta cobrar venda de outro operador (`sale.operatorId !== req.user.sub`) | atendido | `apps/api/src/modules/payments/payments.controller.ts:79-80`, `apps/api/src/modules/payments/payments.service.ts:181-204`, `apps/api/src/modules/payments/payments.service.spec.ts:458-468`, `apps/api/test/payments.e2e-spec.ts:505-539` |

## Apontamentos

*(Sem apontamentos — todos os critérios aplicáveis à Tarefa 6 foram verificados no diff e validados com a execução de `npm test -w apps/api` (9 arquivos / 101 testes passaram) e `npx --workspace=apps/api vitest run --config vitest.config.e2e.ts test/payments.e2e-spec.ts` (1 arquivo / 22 testes passaram).)*
</Parecer de Conformidade — Tarefa 6>
