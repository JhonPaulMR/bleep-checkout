# Parecer de Conformidade — Tarefa 3
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Layout da tela de Produtos (título, botão `+ Novo Produto`, cards de resumo `Produtos ativos` e `Códigos de barras duplicados`, barra de busca local por nome/código e tabela de produtos com preço formatado e status) | atendido | `apps/web/src/app/features/products/pages/products.page.html:7-175`, `apps/web/src/app/features/products/pages/products.page.ts:24-60`, `apps/web/src/app/features/products/pages/products.page.spec.ts:54-111` |
| CA1 — Cadastro via `POST /products`, modal `+ Novo Produto` e disponibilidade imediata no caixa | fora desta tarefa | Coberto nas Tarefas 1 e 4 |
| CA2 — Código de barras duplicado (`409`) destacando campo em `perigo` e mantendo dados | fora desta tarefa | Coberto nas Tarefas 1 e 5 |
| CA3 — Validação de formulário na tela e `400` na API | fora desta tarefa | Coberto nas Tarefas 1 e 4 |
| CA4 — Restrição por papel (`403` na API, menu e proteção de rota no front, `GET /products` para `MANAGER` e `OPERATOR`) | fora desta tarefa | Coberto nas Tarefas 1 e 2 |
| CA5 — Requisição sem token ou token inválido (`401`) | fora desta tarefa | Coberto na Tarefa 1 |
| CA6 — Estado vazio quando não há produtos cadastrados e quando a busca local não encontra resultados, mantendo o botão `+ Novo Produto` disponível | atendido | `apps/web/src/app/features/products/pages/products.page.html:17-24,85-92`, `apps/web/src/app/features/products/pages/products.page.spec.ts:113-149` |
| CA7 — Sessão expirada (`401`) durante preenchimento do modal | fora desta tarefa | Coberto na Tarefa 5 |
| CA8 — Falha de rede ao listar ou cadastrar produto | fora desta tarefa | Coberto na Tarefa 5 |
| CA9 — Abandono/cancelamento do modal sem persistir | fora desta tarefa | Coberto na Tarefa 4 |
| Premissa (Assume que / Fora de escopo) — Botões Editar e Desativar desabilitados na tabela até a Issue `#14` (US13) | atendido | `apps/web/src/app/features/products/pages/products.page.html:141-165`, `apps/web/src/app/features/products/pages/products.page.ts:43-44`, `apps/web/src/app/features/products/pages/products.page.spec.ts:151-164` |
| Glossário (`docs/architecture.md` §5.1) — Entidade `Product` (`id`, `name`, `barcode`, `priceCents`, `active`, `createdAt`), código em inglês e interface em português | atendido | `apps/web/src/app/features/products/pages/products.page.ts:1-60`, `apps/web/src/app/features/products/pages/products.page.html:1-175` |
| Execução dos testes (`npm run test -w apps/web`) | atendido | 14 arquivos / 83 testes passando (incluindo 6 testes em `apps/web/src/app/features/products/pages/products.page.spec.ts`) |

## Apontamentos
