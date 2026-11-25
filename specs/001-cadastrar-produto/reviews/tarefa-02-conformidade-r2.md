# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Camada de serviço (`ProductsService` com `GET /products` e `POST /products` enviando `{ name, barcode, priceCents }` e desembrulhando `{ data }`) | atendido | `apps/web/src/app/features/products/data/products.service.ts:6-37` e `apps/web/src/app/features/products/data/products.service.spec.ts:25-75` |
| CA1 — Cabeçalho seguindo o layout do protótipo `produtos.html` com menu do papel | atendido | `apps/web/src/app/core/layout/header.ts:12-94`, `apps/web/src/app/core/layout/header.spec.ts:18-97` e `apps/web/src/index.html:9-12` |
| CA4 (lado do front — menu por papel) — Operador não vê **Produtos** no menu e gerente vê **Produtos** (`/produtos`) | atendido | `apps/web/src/app/core/layout/header.ts:12-18` e `apps/web/src/app/core/layout/header.spec.ts:18-41` |
| CA4 (lado do front — proteção de rota) — Operador tentando abrir `/produtos` pelo endereço é redirecionado para `/caixa` (e gerente acessa `/produtos`; sem sessão vai para `/login`) | atendido | `apps/web/src/app/app.routes.ts:9-19` e `apps/web/src/app/core/auth/role.guard.spec.ts:96-130` |
| CA2, CA3, CA5, CA6, CA7, CA8, CA9 e demais partes de CA1/CA4 (API e tela/modal de Produtos) | fora desta tarefa | — |

## Apontamentos
