# Parecer de Conformidade — Tarefa 4

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Pagamento por Crédito do cliente com saldo suficiente (`balanceCents >= totalCents`), exibindo prévia de saldo atual/restante, debitando via `POST /sales/:id/payments/credit`, concluindo venda em `COMPLETED` e exibindo saldo atualizado | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:519-562`, `apps/web/src/app/features/checkout/pages/checkout.page.html:489-505,710-740`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1349-1421` |
| CA2 — Saldo insuficiente (`balanceCents < totalCents`) exibe `"Saldo insuficiente — o saldo não será alterado"` e bloqueia a confirmação | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:683-707`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:526`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1302-1347` |
| CA3 — Sem cliente identificado, selecionar Crédito do cliente não conclui o pagamento e exibe `"Selecione um cliente para pagar com crédito."` | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:742-749`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:525`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1288-1300` |
| CA4 — Carrinho vazio mantém o botão de prosseguir para pagamento desabilitado | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1279-1286` |
| CA5 — Modal "Cliente da Venda [F3]", listagem/filtro e envio de `customerId` em `POST /sales` | fora desta tarefa (coberto nas Tarefas 1, 2 e 3) | — |
| CA6 — `401`/`403`/`404` no endpoint `POST /sales/:id/payments/credit` | fora desta tarefa (coberto na Tarefa 1) | — |
| CA7 — `401` limpa sessão e redireciona para `/login` via `authInterceptor`; falha de rede ao debitar exibe `"Não foi possível conectar. Tente novamente."`, mantém venda em `OPEN` e retira botão de carregamento | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:556-560`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1458-1574` |
| CA8 — Trocar de forma de pagamento antes de confirmar o débito não dispara cobrança nem altera o saldo | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:469-482`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1423-1456` |

## Apontamentos

*(Nenhum apontamento. Suíte executada independentemente com `npm run test -w apps/web`: 16 arquivos, 154 testes passando; glossário aderente a `docs/architecture.md`; escopo estritamente alinhado à Tarefa 4 da `spec.md` e do `plan.md`.)*
