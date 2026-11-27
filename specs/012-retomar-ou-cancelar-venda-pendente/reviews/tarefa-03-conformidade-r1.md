# Parecer de Conformidade — Tarefa 3
**Veredito:** APONTAMENTOS

Testes executados: `cd apps/web; npm test` (18 arquivos / 185 testes passando) e `cd apps/web; npm run lint` (0 erros).

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Rota `/pendentes` protegida por `roleGuard('OPERATOR')` e item **Vendas pendentes** no cabeçalho do operador | atendido | `apps/web/src/app/app.routes.ts:9-14`, `apps/web/src/app/core/layout/header.ts:16-19`, `apps/web/src/app/core/layout/header.spec.ts:27-43` |
| CA1 — Listagem de vendas `PENDING` exibindo número, total (`totalCents`), data/hora, cliente (quando houver), selo pendente e ações **Retomar**, **Trocar forma** e **Cancelar** | não atendido (teste) | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:80-145`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:105-134` |
| CA2 — Estado vazio informando claramente que não há vendas pendentes com link/atalho para `/caixa` | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:52-77`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:136-148` |
| CA3 — Ação **Retomar** navegando para `/caixa?saleId=<id>` (parte de `/pendentes`; carregamento em `CheckoutPage` é Tarefa 4) | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:92-95`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:150-163` |
| CA4 — Ação **Cancelar** com confirmação explícita (**Confirmar cancelamento**) chamando `cancelSale` e removendo imediatamente a venda da lista | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:151-208`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:116-156`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:165-190` |
| CA5 — Ação **Trocar forma** na lista `/pendentes` com confirmação antes de chamar `POST /sales/:id/reopen` e navegar para `/caixa?saleId=<id>` | não atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:120-132`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:97-114`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:219-235` |
| CA6 — Validações de status/autorização (`422`/`403`/`404`) na API | fora desta tarefa | — |
| CA7 — Desistência da confirmação de cancelamento (`Voltar` ou `Esc`) sem disparar `cancelSale`, botões desabilitados durante envio e erro de rede claro com retentativa sem perder estado | atendido | `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:85-162`, `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:192-335` |

## Apontamentos
1. **Ação "Trocar forma" dispara `POST /sales/:id/reopen` sem confirmação explícita** — `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:120-132` e `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:97-114`
   Critério violado: `specs/012-retomar-ou-cancelar-venda-pendente/spec.md:22` — "**CA5 — Dado** uma venda `PENDING` pertencente ao operador autenticado (na lista `/pendentes` ou na tela de PIX pendente em `/caixa`), **quando** o operador clicar em **Trocar forma de pagamento** e confirmar (`POST /sales/:id/reopen`), **então**..."
   Evidência: O botão `reopen-sale-btn` está ligado diretamente a `(click)="reopenSale(sale)"` (`pending-sales.page.html:124`), e `reopenSale` chama imediatamente `this.pendingSalesService.reopenSale(sale.id)` (`pending-sales.page.ts:103`) sem etapa de confirmação. No teste em `pending-sales.page.spec.ts:219-235`, um único clique no botão já dispara `reopenSale`. Como a reabertura marca o `Payment` PIX pendente como `ABANDONED`, omitir a confirmação pedida no CA5 permite abandonar a cobrança PIX por clique acidental.

2. **Teste de CA1 promete verificar data/hora, mas não possui asserção para data/hora** — `apps/web/src/app/features/pending-sales/pages/pending-sales.page.spec.ts:105-134`
   Critério violado: `specs/012-retomar-ou-cancelar-venda-pendente/spec.md:18` — "**CA1** ... exibindo número da venda, total (`totalCents`), data/hora e nome do cliente (quando houver), com selo de pendente e ações **Retomar**, **Trocar forma** e **Cancelar**"
   Evidência: Embora o template renderize `{{ formatDateTime(sale.createdAt) }}` em `pending-sales.page.html:102`, o teste `'renderiza lista de vendas pendentes com e sem cliente, número, total, data/hora, selo e ações (CA1)'` valida número (`#10`, `#11`), total (`25,00`, `12,90`), cliente (`Maria Oliveira`), selo e botões, mas não faz nenhuma asserção sobre a data/hora exibida nos cartões. Se a exibição de data/hora fosse removida do template, o teste continuaria passando.
