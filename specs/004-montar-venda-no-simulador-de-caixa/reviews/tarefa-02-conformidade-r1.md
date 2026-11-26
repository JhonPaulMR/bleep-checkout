# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Serviço de busca por código de barras (`GET /products/barcode/:barcode` desembrulhando `{ data }`) | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:104-109`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:76-88` |
| CA3 — Serviço de busca por nome (`GET /products?search=<termo>` desembrulhando `{ data }`) | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:111-120`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:90-116` |
| CA2 — Leitura por leitor USB (`keydown.enter`) e manutenção de foco no campo | fora desta tarefa | — |
| CA4 — Alerta de erro `404` ("Produto não localizado.") na tela sem alterar carrinho | fora desta tarefa | — |
| CA5 — Estado vazio ("Nenhum produto encontrado.") no modal de busca | fora desta tarefa | — |
| CA6 — Layout do PDV conforme protótipo (`caixa.html` e `busca.html`) | fora desta tarefa | — |
| CA7 — Proteção de rotas na API (`JwtAuthGuard`, `RolesGuard`, filtro de ativos por papel) | fora desta tarefa | — |
| CA8 — Tratamento de sessão expirada (`401`) e falha de rede na tela | fora desta tarefa | — |
| CA9 — Cancelamento do modal (`Esc`/fechar) e limpeza do carrinho sem criar venda | fora desta tarefa | — |

## Apontamentos

*(Nenhum apontamento. Testes executados via `npm run test -w apps/web`: 16 arquivos, 119 testes passando, incluindo os 12 testes de `checkout.service.spec.ts`.)*
