# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| **CA1** — Serviço de débito de crédito (`POST /sales/:id/payments/credit` retornando `{ sale, payment, customerBalanceCents }` desembrulhado de `{ data }`) | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:103-107,207-214`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:305-339` |
| **CA5** — Serviço de listagem de clientes (`GET /customers`) e envio opcional de `customerId` em `POST /sales` (incluindo `CheckoutCustomer` e `customer`/`customerId` em `Sale`) | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:56-76,120-124,144-154`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:86-98,142-206` |
| **CA2** — Saldo insuficiente (bloqueio na tela / `422` na API) | fora desta tarefa | Coberto na Tarefa 1 (API) e previsto para Tarefa 4 (UI) |
| **CA3** — Sem cliente identificado (aviso na tela / `422` na API) | fora desta tarefa | Coberto na Tarefa 1 (API) e previsto para Tarefa 4 (UI) |
| **CA4** — Carrinho vazio bloqueado e venda não `OPEN` | fora desta tarefa | Coberto na Tarefa 1 (API) e previsto para Tarefa 4 (UI) |
| **CA6** — Autenticação e autorização `401`/`403`/`404` em `POST /sales/:id/payments/credit` | fora desta tarefa | Coberto na Tarefa 1 (API) |
| **CA7** — Sessão expirada (`401`) e falha de rede na tela | fora desta tarefa | Previsto para Tarefas 3 e 4 (`CheckoutService` não engole erros HTTP nos novos métodos) |
| **CA8** — Abandono no modal de cliente ou troca de forma de pagamento | fora desta tarefa | Previsto para Tarefas 3 e 4 |

## Evidência de verificação
- **Testes executados pelo revisor:** `npm run test -w apps/web` — 16 arquivos de teste, 140 testes passando (incluindo 16 testes em `checkout.service.spec.ts`).
- **Glossário (`docs/architecture.md` §5.1):** atributos (`id`, `name`, `cpf`, `balanceCents`, `customerId`, `customerBalanceCents`, `CUSTOMER_CREDIT`, `APPROVED`) e contrato do endpoint `POST /sales/:id/payments/credit` alinhados ao backend (`PaymentsService.payWithCustomerCredit`) e ao plano.
- **Escopo:** apenas `checkout.service.ts` e `checkout.service.spec.ts` modificados, sem comportamento fora da spec.

## Apontamentos
*(nenhum)*
