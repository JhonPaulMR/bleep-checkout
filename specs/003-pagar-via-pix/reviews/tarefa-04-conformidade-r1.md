</Revisor de Conformidade>
<Parecer de Conformidade — Tarefa 4>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA2 (lado da API): `GET /payments/config` devolve `200` apenas com `publicKey` (`MP_PUBLIC_KEY`) e nunca expõe `MP_ACCESS_TOKEN` ou `MP_WEBHOOK_SECRET` | atendido | `apps/api/src/modules/payments/payments.controller.ts:18-40`, `apps/api/test/payments.e2e-spec.ts:31-47` |
| CA8 (para `GET /payments/config`): sem JWT válido recebe `401`; para `MANAGER` recebe `403` (RN13) | atendido | `apps/api/src/modules/payments/payments.controller.ts:18-19`, `apps/api/test/payments.e2e-spec.ts:49-60` |
| Máquina de estados de referência (`Sale.status`): permite apenas `OPEN → COMPLETED\|PENDING` e `PENDING → COMPLETED\|OPEN`, bloqueando regressões de `COMPLETED` e `CANCELED` | atendido | `apps/api/src/modules/payments/payment-state-machine.ts:3-8,21-23`, `apps/api/src/modules/payments/payment-state-machine.spec.ts:8-34` |
| Máquina de estados de referência (`Payment.status`): permite apenas `PENDING → APPROVED\|DECLINED\|ABANDONED`, bloqueando transições a partir de `APPROVED`/`DECLINED`/`ABANDONED` | atendido | `apps/api/src/modules/payments/payment-state-machine.ts:10-19,25-30`, `apps/api/src/modules/payments/payment-state-machine.spec.ts:36-62` |
| Pré-requisito de CA3–CA6 e CA10: interface `PaymentGateway` (token `PAYMENT_GATEWAY`) e implementação `MercadoPagoGateway` com SDK oficial `mercadopago` (`createCardPayment`, `createPixPayment`, `getPayment` com `idempotencyKey` e `externalReference`), registrada e exportada em `PaymentsModule` / `AppModule` | atendido | `apps/api/src/modules/payments/payment-gateway.interface.ts:1-50`, `apps/api/src/modules/payments/mercadopago.gateway.ts:14-85`, `apps/api/src/modules/payments/payments.module.ts:6-16`, `apps/api/src/app.module.ts:24` |
| CA12 (ausência de segredos no código) e aderência ao glossário de `docs/architecture.md` | atendido | `apps/api/src/modules/payments/mercadopago.gateway.ts:18`, `apps/api/src/modules/payments/payments.controller.ts:38` |
| CA1, CA3–CA7, CA9–CA11 e lado do frontend de CA2 | fora desta tarefa | — |

## Apontamentos

*(Nenhum apontamento. Verificações executadas: `npm test` — API 85/85 incluindo 32/32 em `payment-state-machine.spec.ts` e Web 50/50; `npm run lint` — 0 warnings e 0 errors em api e web; `test/payments.e2e-spec.ts` — 3/3 ok. Nota de execução: `npm run test:e2e` em paralelo apresentou falha pontual pré-existente de concorrência em `test/users.e2e-spec.ts:307` ao rodar junto com `test/seed.e2e-spec.ts`, e passou 67/67 ao rodar sequencialmente com `--fileParallelism=false`.)*
</Parecer de Conformidade — Tarefa 4>
