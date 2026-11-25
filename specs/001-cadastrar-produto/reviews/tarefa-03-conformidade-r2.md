# Parecer de Conformidade — Tarefa 3

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Listagem e layout da tela de Produtos (cards de resumo, busca por nome/código, tabela de produtos com preço formatado e status, botão `+ Novo Produto`) | atendido | `apps/web/src/app/features/products/pages/products.page.html:1-177`, `apps/web/src/app/features/products/pages/products.page.ts:1-58`, `apps/web/src/app/features/products/pages/products.page.spec.ts:54-112` |
| CA1 — Cadastro pela interface (modal `+ Novo Produto` e `POST /products`) | fora desta tarefa (Tarefa 4) | — |
| CA2 — Conflito `409` no cadastro de código de barras duplicado | fora desta tarefa (Tarefas 1 e 5) | — |
| CA3 — Validação de campos no formulário e na API | fora desta tarefa (Tarefas 1 e 4) | — |
| CA4 — Controle de acesso por papel (`RolesGuard` e menu/rotas) | fora desta tarefa (Tarefas 1 e 2) | — |
| CA5 — Rejeição `401` sem token ou token inválido | fora desta tarefa (Tarefa 1) | — |
| CA6 — Estado vazio quando não há produtos cadastrados ou quando a busca local não encontra resultados, mantendo botão `+ Novo Produto` disponível | atendido | `apps/web/src/app/features/products/pages/products.page.html:17-24,87-95`, `apps/web/src/app/features/products/pages/products.page.spec.ts:113-149` |
| CA7 — Sessão expirada (`401`) durante o cadastro | fora desta tarefa (Tarefa 5) | — |
| CA8 — Falha de rede ao listar produtos exibe `"Não foi possível conectar. Tente novamente."` sem mascarar como estado vazio | atendido (parte de listagem; cadastro na Tarefa 5) | `apps/web/src/app/features/products/pages/products.page.ts:47-51`, `apps/web/src/app/features/products/pages/products.page.html:85-86`, `apps/web/src/app/features/products/pages/products.page.spec.ts:166-175` |
| CA9 — Abandono/cancelamento do modal sem persistir | fora desta tarefa (Tarefa 4) | — |
| Fora de escopo / Assume que (`#14`) — Botões `Editar` e `Desativar` desabilitados na tabela | atendido | `apps/web/src/app/features/products/pages/products.page.html:143-167`, `apps/web/src/app/features/products/pages/products.page.ts:34-35`, `apps/web/src/app/features/products/pages/products.page.spec.ts:151-164` |
| Glossário (`docs/architecture.md` §5.1) — Código em inglês (`Product`, `barcode`, `priceCents`, `active`) e interface em português | atendido | `apps/web/src/app/features/products/pages/products.page.ts:1-58`, `apps/web/src/app/features/products/pages/products.page.html:1-177` |

## Apontamentos

*(Sem apontamentos. Suíte `npm run test -w apps/web` executada com sucesso: 14 arquivos, 84 testes passando, 7/7 em `products.page.spec.ts`.)*
