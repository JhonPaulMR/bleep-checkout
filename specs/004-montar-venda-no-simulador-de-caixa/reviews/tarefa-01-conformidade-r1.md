# Parecer de Conformidade — Tarefa 1

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (lado da API) — `GET /products/barcode/:barcode` localiza o único produto ativo correspondente (`200`) | atendido | `apps/api/src/modules/products/products.controller.ts:67-91`, `apps/api/src/modules/products/products.service.ts:67-75`, `apps/api/test/products.e2e-spec.ts:306-341` |
| CA2 — Leitor de código de barras USB (`keydown.enter`) e foco no campo no caixa | fora desta tarefa | — |
| CA3 (lado da API) — `GET /products?search=<termo>` retorna produtos ativos encontrados com `name`, `barcode` e `priceCents` | atendido | `apps/api/src/modules/products/products.controller.ts:43-65`, `apps/api/src/modules/products/products.service.ts:49-65`, `apps/api/test/products.e2e-spec.ts:416-449` |
| CA4 (lado da API) — `GET /products/barcode/:barcode` retorna `404` com `"Produto não localizado."` para código inexistente ou produto desativado | atendido | `apps/api/src/modules/products/products.service.ts:71-73`, `apps/api/src/modules/products/products.service.spec.ts:167-176`, `apps/api/test/products.e2e-spec.ts:343-384` |
| CA5 (lado da API) — `GET /products?search=<termo>` sem correspondência retorna `200` com lista vazia (`[]`) | atendido | `apps/api/src/modules/products/products.service.ts:61-64`, `apps/api/test/products.e2e-spec.ts:450-455` |
| CA6 — Layout do PDV seguindo protótipo (`caixa.html` e `busca.html`) | fora desta tarefa | — |
| CA7 — `GET /products/barcode/:barcode` recusa sem token/token inválido (`401`) e `MANAGER` (`403`); `GET /products?search=<termo>` restringe a ativos para `OPERATOR` (case-insensitive) e mantém acesso ao catálogo para `MANAGER` | atendido | `apps/api/src/modules/products/products.controller.ts:44,68`, `apps/api/src/modules/products/products.service.ts:52-59`, `apps/api/test/products.e2e-spec.ts:386-490` |
| CA8 — Sessão expirada (`401` no front) e falha de rede no front | fora desta tarefa | — |
| CA9 — Fechar modal de busca sem selecionar ou limpar carrinho no front | fora desta tarefa | — |

## Apontamentos
