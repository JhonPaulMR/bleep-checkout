# Parecer de Conformidade — Tarefa 2

**Veredito:** APONTAMENTOS

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Camada de serviço (`ProductsService` com `GET /products` e `POST /products` enviando `{ name, barcode, priceCents }` e desembrulhando `{ data }`) | atendido | `apps/web/src/app/features/products/data/products.service.ts:15-46` e `apps/web/src/app/features/products/data/products.service.spec.ts:25-75` |
| CA1 — Cabeçalho seguindo o layout do protótipo `produtos.html` com menu do papel | atendido | `apps/web/src/app/core/layout/header.ts:12-95`, `apps/web/src/app/core/layout/header.spec.ts:18-97` e `apps/web/src/index.html:9-12` |
| CA4 (lado do front — menu por papel) — Operador não vê **Produtos** no menu e gerente vê **Produtos** (`/produtos`) | atendido | `apps/web/src/app/core/layout/header.ts:12-18` e `apps/web/src/app/core/layout/header.spec.ts:18-41` |
| CA4 (lado do front — proteção de rota) — Operador tentando abrir `/produtos` pelo endereço é redirecionado para `/caixa` | não atendido | `apps/web/src/app/app.routes.ts:15-20` (rota protegida no código, mas sem teste cobrindo `/produtos` em `apps/web/src/app/core/auth/role.guard.spec.ts`) |
| CA2, CA3, CA5, CA6, CA7, CA8, CA9 e demais partes de CA1/CA4 (API e tela/modal de Produtos) | fora desta tarefa | — |

## Apontamentos
1. **Proteção da rota `/produtos` não possui teste automatizado** — `apps/web/src/app/app.routes.ts:15-20`
   Critério violado: `specs/001-cadastrar-produto/spec.md:21` (CA4 — *"na interface, o menu do operador não exibe **Produtos** e tentar abrir a rota de produtos pelo endereço redireciona para `/caixa`"*), escopo explícito da Tarefa 2 (*"CA4 (lado do front — menu por papel e proteção de rota)"*).
   Evidência: O diff adiciona a rota `path: 'produtos'` com `canMatch: [roleGuard('MANAGER')]` em `apps/web/src/app/app.routes.ts:15-20`, mas não adiciona nenhum teste de navegação para `/produtos` (em `apps/web/src/app/core/auth/role.guard.spec.ts`, há um bloco `describe('rota /operadores', ...)` nas linhas 60-94, porém nenhum teste equivalente para `/produtos`). Se `canMatch: [roleGuard('MANAGER')]` fosse removido da rota `/produtos`, todos os 74 testes executados por `npm run test -w apps/web` continuariam passando.
