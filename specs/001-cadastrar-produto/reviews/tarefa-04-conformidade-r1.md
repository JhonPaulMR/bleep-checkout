# Parecer de Conformidade — Tarefa 4

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| **CA1** (cadastro pela interface: modal "+ Novo Produto", envio válido para `POST /products` com `priceCents` em centavos, atualização da tabela e contagem de ativos, fechamento do modal) | atendido | `apps/web/src/app/features/products/pages/products.page.html:11-19`, `173-326`; `apps/web/src/app/features/products/pages/products.page.ts:10-19`, `99-149`; `apps/web/src/app/features/products/pages/products.page.spec.ts:325-386` |
| **CA2** (conflito `409` por código de barras duplicado no formulário) | fora desta tarefa | Coberto na Tarefa 1 (API) e previsto para a Tarefa 5 (front) |
| **CA3** (validação inline no formulário: bloqueia envio e exibe mensagem junto ao campo para nome vazio/espaços, EAN-13 ausente ou diferente de 13 dígitos numéricos, preço ausente/zero/negativo) | atendido | `apps/web/src/app/features/products/pages/products.page.ts:42-61`, `109-117`; `apps/web/src/app/features/products/pages/products.page.html:204-283`; `apps/web/src/app/features/products/pages/products.page.spec.ts:269-323` |
| **CA4** (permissões por papel `MANAGER`/`OPERATOR` na API, menu e rotas) | fora desta tarefa | Coberto nas Tarefas 1 e 2 |
| **CA5** (autenticação `401` em `POST /products` e `GET /products`) | fora desta tarefa | Coberto na Tarefa 1 |
| **CA6** (estado vazio e busca sem resultados) | fora desta tarefa | Coberto na Tarefa 3 |
| **CA7** (sessão expirada `401` ao salvar produto no modal) | fora desta tarefa | Previsto para a Tarefa 5 |
| **CA8** (falha de rede / servidor fora do ar ao listar ou cadastrar) | fora desta tarefa | Previsto para a Tarefa 5 |
| **CA9** (abandono/cancelamento do modal ou fechamento da aba sem persistir registro parcial nem chamar `POST /products`) | atendido | `apps/web/src/app/features/products/pages/products.page.ts:34-40`, `99-107`, `142-149`; `apps/web/src/app/features/products/pages/products.page.html:193-201`, `302-309`; `apps/web/src/app/features/products/pages/products.page.spec.ts:227-267` |

**Evidências verificadas diretamente:**
- Diff conferido integralmente via `git diff 423d69157501228983d8abc36a9e6c49693f26df --cached` (3 arquivos alterados: `products.page.html`, `products.page.ts`, `products.page.spec.ts`).
- Suíte executada diretamente com `npm run test -w apps/web`: **14/14 arquivos passaram, 88/88 testes passaram** (incluindo os 11/11 testes de `products.page.spec.ts`).
- Glossário do `docs/architecture.md` respeitado: atributos de domínio em inglês (`name`, `barcode`, `priceCents`, `active`) e interface em português; nenhum escopo fora da tarefa foi introduzido.

## Apontamentos
