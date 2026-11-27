# Parecer de Conformidade — Tarefa 4

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Listagem `/pendentes` (`GET /sales?status=PENDING`) e item no cabeçalho | fora desta tarefa | — |
| CA2 — Estado vazio em `/pendentes` com atalho para o caixa | fora desta tarefa | — |
| CA3 — `CheckoutPage` carrega venda `PENDING` via `?saleId=<id>` (`GET /sales/:id`), exibe o mesmo QR Code PIX (`qrCodeBase64` e `qrCode`) do pagamento `PENDING` sem gerar nova cobrança, retoma polling e mantém `PENDING` até confirmação/cancelamento | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:277-282,897-958`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:2359-2432` |
| CA4 — Cancelar venda `PENDING` em `/pendentes` com confirmação explícita | fora desta tarefa | — |
| CA5 — Botão **Trocar forma de pagamento** na tela PIX `PENDING` em `/caixa` com confirmação explícita chamando `reopenSale`, encerrando polling e liberando as 5 formas de pagamento em `OPEN` (e abertura direta em `OPEN` via `?saleId=<id>`) | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:658-668,1366-1424`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:807-861,934-937,1132-1137`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:2434-2568` |
| CA6 — Recusas `422`/`403`/`404` da API | fora desta tarefa | — |
| CA7 — Desistência da confirmação (`Voltar`/`Esc`), botões desabilitados durante envio para evitar duplo clique, erro de rede ao carregar venda via `?saleId=` ou ao reabrir mantendo estado e permitindo repetir, e remoção do `TODO #12` | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:3-43,658-687,1366-1424`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:285-316,807-875,897-915`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:2570-2704` |

## Evidências de execução
- `cd apps/web; npm test`: 18 arquivos de teste aprovados, 191 testes aprovados (incluindo os 59 testes de `checkout.page.spec.ts`).
- `cd apps/web; npm run lint`: `All files pass linting.`
- Escopo e glossário: somente os 3 arquivos previstos na Tarefa 4 foram alterados (`checkout.page.html`, `checkout.page.ts`, `checkout.page.spec.ts`), sem escopo inflado e com nomenclatura aderente ao glossário do `docs/architecture.md`.

## Apontamentos
*(nenhum)*
