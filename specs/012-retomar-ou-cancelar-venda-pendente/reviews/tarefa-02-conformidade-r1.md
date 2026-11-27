# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — `PendingSalesService.listPendingSales()` chama `GET /sales?status=PENDING` e desembrulha `{ data }` com os campos exigidos (`number`, `totalCents`, `createdAt`, `customer`, `status`, `items`, `payments`) | atendido | `apps/web/src/app/features/pending-sales/data/pending-sales.service.ts:74-78`, `apps/web/src/app/features/pending-sales/data/pending-sales.service.spec.ts:72-84` |
| CA2 — Estado vazio na UI `/pendentes` com atalho para `/caixa` | fora desta tarefa (Tarefa 3) | — |
| CA3 — Retomar venda via `/caixa?saleId=<id>` mantendo QR Code e polling | fora desta tarefa (Tarefas 3 e 4) | — |
| CA4 — `PendingSalesService.cancelSale(saleId)` chama `POST /sales/:id/cancel` com `encodeURIComponent(saleId)` e desembrulha `{ data }` | atendido | `apps/web/src/app/features/pending-sales/data/pending-sales.service.ts:80-84`, `apps/web/src/app/features/pending-sales/data/pending-sales.service.spec.ts:86-105` |
| CA5 — `PendingSalesService.reopenSale(saleId)` e `CheckoutService.reopenSale(saleId)` chamam `POST /sales/:id/reopen` com `encodeURIComponent(saleId)` e desembrulhando `{ data }` | atendido | `apps/web/src/app/features/pending-sales/data/pending-sales.service.ts:86-90`, `apps/web/src/app/features/pending-sales/data/pending-sales.service.spec.ts:107-126`, `apps/web/src/app/features/checkout/data/checkout.service.ts:175-179`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:458-477` |
| CA6 — Validações `422`/`403`/`404` da API | fora desta tarefa (Tarefa 1) | — |
| CA7 — Abandono no meio, desistência de confirmação e tratamento de erro de rede na UI | fora desta tarefa (Tarefas 3 e 4) | — |

## Apontamentos

*(nenhum)*

## Verificações executadas
- `git diff 9796b8843d897e5b760be60ff937a5dda16bd31e`: apenas os 4 arquivos previstos na Tarefa 2, sem escopo inflado e com nomenclatura integralmente alinhada ao glossário de `docs/architecture.md` (§5.1).
- `cd apps/web; npm test`: 17 arquivos de teste / 174 testes passando (incluindo 3 novos em `pending-sales.service.spec.ts` e 20 em `checkout.service.spec.ts`).
- `cd apps/web; npm run lint`: aprovado sem alertas ou erros.
