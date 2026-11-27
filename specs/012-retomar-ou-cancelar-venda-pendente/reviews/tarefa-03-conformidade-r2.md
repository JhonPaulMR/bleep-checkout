<Parecer de Conformidade — Tarefa 3>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Rota `/pendentes` protegida por `roleGuard('OPERATOR')`, item "Vendas pendentes" no cabeçalho do operador, listagem via `listPendingSales()` exibindo número, total (`totalCents`), data/hora, cliente quando houver, selo de pendente e ações **Retomar**, **Trocar forma** e **Cancelar** | atendido | `apps/web/src/app/app.routes.ts:38-43`, `apps/web/src/app/core/layout/header.ts:16-19`, `apps/web/src/app/core/layout/header.spec.ts:36-50`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:55-75`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:72-135`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:106-150` |
| CA2 — Estado vazio em `/pendentes` informando claramente que não há vendas pendentes com atalho para `/caixa` | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:43-68`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:152-164` |
| CA3 (navegação) — Ação **Retomar** navega para `/caixa?saleId=<id>` *(carregamento do QR Code e polling em `CheckoutPage` são da Tarefa 4)* | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:94-97`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:166-179` |
| CA4 — Ação **Cancelar** abre confirmação explícita (**Confirmar cancelamento**), chama `cancelSale()` e remove imediatamente a venda da lista | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:139-177`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:198-254`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:181-206` |
| CA5 (confirmação e reabertura em `/pendentes`) — Ação **Trocar forma** abre confirmação explícita, chama `reopenSale()` e navega para `/caixa?saleId=<id>` *(troca na tela PIX em `/caixa` é da Tarefa 4)* | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:99-137`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:138-196`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:235-289` |
| CA6 — Recusas `422`, `403` e `404` na API | fora desta tarefa | Coberto na Tarefa 1 |
| CA7 — Desistência da confirmação via `Voltar`/`Esc` sem disparar requisição, desabilitação de botões durante envio contra duplo clique, e tratamento de falha de rede ao listar, cancelar ou reabrir com mensagem clara e retentativa sem perder o estado | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:59-75`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:87-92`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:105-190`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:29-42`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:208-233`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:264-415` |

## Apontamentos

*(nenhum — testes `cd apps/web; npm test` passaram 18/18 arquivos e 186/186 testes; `cd apps/web; npm run lint` passou sem erros; escopo e glossário aderentes à spec e a `docs/architecture.md`.)*
</Parecer de Conformidade — Tarefa 3>
