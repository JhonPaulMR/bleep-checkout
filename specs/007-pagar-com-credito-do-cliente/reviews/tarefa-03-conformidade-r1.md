# Parecer de Conformidade — Tarefa 3

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Pagamento por crédito do cliente (débito atômico e conclusão) | fora desta tarefa (coberto nas Tarefas 1, 2 e 4) | — |
| CA2 — Saldo insuficiente bloqueia confirmação na tela e retorna 422 na API | fora desta tarefa (coberto nas Tarefas 1 e 4) | — |
| CA3 — Pagamento por crédito sem cliente identificado | fora desta tarefa (coberto nas Tarefas 1 e 4) | — |
| CA4 — Venda sem produtos no carrinho / venda não `OPEN` | fora desta tarefa (coberto nas Tarefas 1 e 4) | — |
| CA5 — Card `Cliente da Venda [F3]`, abertura do modal por botão e `F3` carregando `GET /customers`, filtro por nome/CPF, exibição de nome, CPF e saldo em destaque verde (`text-sucesso`) e envio de `customerId` opcional em `POST /sales` | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:273-344`, `apps/web/src/app/features/checkout/pages/checkout.page.html:834-957`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:132-151`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:215-219`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:311-356`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:441-445`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:224`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1052-1171` |
| CA6 — Autorização (`401`/`403`) e venda inexistente (`404`) em `POST /sales/:id/payments/credit` | fora desta tarefa (coberto na Tarefa 1) | — |
| CA7 — Sessão expirada (`401`) ou falha de rede ao carregar clientes (parte de carregamento de clientes; débito e teste integrado `401` com `authInterceptor` previstos na Tarefa 4) | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:331-348`, `apps/web/src/app/features/checkout/pages/checkout.page.html:895-907`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1246-1276` |
| CA8 — Fechar modal de seleção de cliente (`Esc`, Cancelar ou backdrop) sem escolher mantém cliente e carrinho inalterados (parte do modal; troca de método de pagamento fica na Tarefa 4) | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:194-205`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:320-329`, `apps/web/src/app/features/checkout/pages/checkout.page.html:842-843`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1076-1078`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1205-1244` |

## Apontamentos

*(Sem apontamentos. Testes executados nesta revisão: `npm run test -w apps/web` — 16 arquivos, 147 testes passando; `npm run lint -w apps/web` — 0 erros. Glossário alinhado com `docs/architecture.md` e escopo estritamente restrito à Tarefa 3.)*
