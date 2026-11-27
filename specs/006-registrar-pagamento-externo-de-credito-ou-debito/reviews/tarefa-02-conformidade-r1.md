# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Chamada de aprovação externa (`POST /sales/:id/payments/external` com `{ method, approved: true }` para `EXTERNAL_CREDIT` \| `EXTERNAL_DEBIT` e desembrulho de `{ data }`) | atendido (parte do `CheckoutService`) | `apps/web/src/app/features/checkout/data/checkout.service.ts:223-235`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:341-382` |
| CA2 — Chamada de não aprovação externa (`POST /sales/:id/payments/external` com `{ method, approved: false }` e desembrulho de `{ data }`) | atendido (parte do `CheckoutService`) | `apps/web/src/app/features/checkout/data/checkout.service.ts:223-235`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:384-421` |
| CA3 — Envio estrito de `{ method, approved }` (`EXTERNAL_CREDIT` \| `EXTERNAL_DEBIT` e `approved` booleano) somente mediante invocação explícita | atendido (parte do `CheckoutService`) | `apps/web/src/app/features/checkout/data/checkout.service.ts:24,100-103,223-227`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:362-378` |
| CA4 — Controle de acesso (`403` para `MANAGER` ou outro `OPERATOR`, `404` venda inexistente) | fora desta tarefa | — |
| CA5 — Rejeição `422` para venda não `OPEN` e estado de carregamento na UI | fora desta tarefa | — |
| CA6 — Abandono sem envio automático e tratamento de falha de rede na UI | fora desta tarefa | — |

## Apontamentos
*(nenhum — implementação e testes estão em conformidade com o `spec.md` e o glossário do `docs/architecture.md`; `npm test` (16 arquivos / 156 testes, incluindo 18 em `checkout.service.spec.ts`) e `npm run lint` executados e aprovados sem erros.)*
