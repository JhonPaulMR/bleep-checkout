<Parecer de Conformidade — Tarefa 3>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — `POST /sales` para `OPERATOR` autenticado aceita apenas `{ items: [{ productId, quantity }] }`, busca `priceCents` no banco, calcula `totalCents = soma(priceCents * quantity)`, grava `Sale` (`status: OPEN`) e `SaleItem` (`unitPriceCents` do banco) em transação e devolve `201` | atendido | `apps/api/src/modules/sales/sales.controller.ts:20-44`, `apps/api/src/modules/sales/sales.service.ts:21-82`, `apps/api/src/modules/sales/dto/create-sale.dto.ts:13-32`, `apps/api/test/sales.e2e-spec.ts:149-184` |
| CA1 — Qualquer campo de preço/valor enviado pelo cliente (`totalCents`, `priceCents`, `transaction_amount`) é rejeitado com `400` pelo `ValidationPipe` (`forbidNonWhitelisted`) | atendido | `apps/api/src/app.module.ts:29-36`, `apps/api/src/modules/sales/dto/create-sale.dto.ts:13-32`, `apps/api/test/sales.e2e-spec.ts:186-224` |
| CA1 — Lista vazia, quantidade `<= 0` ou produto inexistente/inativo é rejeitada com `400`/`422` | atendido | `apps/api/src/modules/sales/dto/create-sale.dto.ts:20-29`, `apps/api/src/modules/sales/sales.service.ts:22-52`, `apps/api/src/modules/sales/sales.service.spec.ts:171-219`, `apps/api/test/sales.e2e-spec.ts:226-267` |
| CA8 — `GET /products`, `POST /sales` e `GET /sales/:id`: `401` sem JWT válido e `403` para `MANAGER` (RN13) | atendido | `apps/api/src/modules/products/products.controller.ts:19-35`, `apps/api/src/modules/sales/sales.controller.ts:20-64`, `apps/api/src/app.module.ts:25-26`, `apps/api/test/sales.e2e-spec.ts:104-145,269-288,345-355,371-375` |
| CA8 — `GET /sales/:id` bloqueia consulta de venda pertencente a outro operador (`sale.operatorId !== req.user.sub`) com `403` (e devolve `404` quando inexistente) | atendido | `apps/api/src/modules/sales/sales.service.ts:84-101`, `apps/api/src/modules/sales/sales.service.spec.ts:222-273`, `apps/api/test/sales.e2e-spec.ts:291-370` |
| CA8 — Rotas de pagamento (`GET /payments/config`, `POST /sales/:id/payments/card`, `POST /sales/:id/payments/pix`) e demais critérios (CA2–CA7, CA9–CA12) | fora desta tarefa | `specs/003-pagar-via-pix/plan.md:46-81` |

## Apontamentos

*(Nenhum apontamento. Verificações executadas: `npm test` — API 7 arquivos / 53 testes ok, Web 10 arquivos / 50 testes ok; `npm run test:e2e` — 5 arquivos / 64 testes ok, sendo 17/17 em `apps/api/test/sales.e2e-spec.ts`; `npm run lint` — 0 warnings e 0 errors em api e web.)*
</Parecer de Conformidade — Tarefa 3>
