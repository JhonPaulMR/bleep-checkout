<Parecer de Conformidade — Tarefa 2>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| Pré-requisito de CA1 (`Product` com `priceCents`, `active`, `barcode` único; `Sale` com `status: OPEN`, `totalCents`; `SaleItem` com `unitPriceCents`, `quantity` e unicidade `(saleId, productId)`) | atendido | `apps/api/prisma/schema.prisma:18-23,55-92`; `apps/api/prisma/migrations/20261124181202_create_sales_and_payments/migration.sql:1-44,71-88,98-105` |
| Pré-requisito de CA3, CA4, CA5, CA6 (`Payment` com `method` `CARD`/`PIX`, `status` `PENDING`/`APPROVED`/`DECLINED`/`ABANDONED`, `amountCents`, `gatewayPaymentId`, `qrCode`, `qrCodeBase64`; `Sale.status` com `OPEN`/`PENDING`/`COMPLETED`/`CANCELED` e `completedAt`) | atendido | `apps/api/prisma/schema.prisma:18-38,65-78,94-107`; `apps/api/prisma/migrations/20261124181202_create_sales_and_payments/migration.sql:1-9,22-33,47-59,89-93,107-108` |
| Pré-requisito de CA11 (unicidade de `Payment.gatewayPaymentId` e `WebhookEvent.gatewayEventId` no banco, comprovada com violação `P2002`) | atendido | `apps/api/prisma/schema.prisma:101,111`; `apps/api/prisma/migrations/20261124181202_create_sales_and_payments/migration.sql:90,96`; `apps/api/test/payments-schema.e2e-spec.ts:168-221` |
| Premissa da spec (`Assume que`: catálogo inicial de produtos via `prisma/seed.ts` com `// TODO #1`, sem cadastro pela UI) | atendido | `apps/api/prisma/seed.ts:43-70,97-99` |
| Aderência ao glossário de `docs/architecture.md` (§5.1) e valores em centavos inteiros (`Int`, ID8) | atendido | `apps/api/prisma/schema.prisma:59,71,87,100` |
| Cobertura de teste e2e da Tarefa 2 (criação de `Sale` + `SaleItem` + `Payment` + `WebhookEvent` e violação `P2002` executando contra Postgres real) | atendido | `apps/api/test/payments-schema.e2e-spec.ts:104-268` (`npm run test:e2e`: 4 arquivos / 47 testes passando, incluindo 5/5 em `payments-schema.e2e-spec.ts`; `npm test`: api 6/43 e web 10/50 passando; `prisma migrate status`: schema atualizado) |
| Escopo estrito da Tarefa 2 (sem lógica de negócio de endpoints/serviços de tarefas futuras) | atendido | `git diff 07db354201ae23781a748fad421edb669a2fc457` (apenas os 4 arquivos previstos no `plan.md`) |

## Apontamentos

</Parecer de Conformidade — Tarefa 2>
