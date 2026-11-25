# Plano — Issue #1

## Decisões técnicas

- **API (`apps/api/src/modules/products/`):**
  - `POST /products` — protegido por `@Roles(Role.MANAGER)`, corpo validado por `CreateProductDto` (`name`: string não vazia após `trim()`, `barcode`: exatamente 13 dígitos numéricos `/^\d{13}$/`, `priceCents`: inteiro positivo `@IsInt() @Min(1)`). O servidor grava sempre com `active: true` (qualquer campo extra, como `active`, é recusado com `400` pelo `ValidationPipe` global). Em caso de código de barras duplicado (`P2002` ou pré-checagem), lança `ConflictException('Já existe um produto com este código de barras.')` (`409`). Retorna `201` embrulhado em `{ data }` pelo `ResponseInterceptor`.
  - `GET /products` — passa a aceitar `@Roles(Role.MANAGER, Role.OPERATOR)`. Retorna `200` com `{ data: [...] }` ordenado por `name: 'asc'` (mantendo `active: true` para `OPERATOR` e listando o catálogo para `MANAGER`).
  - Swagger atualizado com `@ApiProperty`, `@ApiOperation` e `@ApiResponse` nos endpoints e no DTO.
- **Frontend (`apps/web`):**
  - Carregar fontes `Inter` e `Material Symbols Outlined` em `apps/web/src/index.html` (conforme protótipo `produtos.html` e `docs/design-tokens.md`).
  - Criar `apps/web/src/app/features/products/data/products.service.ts` como único ponto que fala com `/products` (`list()` e `create(payload)`), desembrulhando `{ data }`.
  - Atualizar `Header` (`apps/web/src/app/core/layout/header.ts`) para seguir o visual do protótipo (marca Bleep, navegação em pílula por papel — Gerente vê **Produtos** e **Operadores**; Operador vê **Caixa** — nome/papel do usuário logado e botão **Sair**).
  - Manter `/cadastros` (e adicionar alias `/produtos` protegido por `canMatch: [roleGuard('MANAGER')]`) carregando `ProductsPage`, preservando compatibilidade com `AREA_BY_ROLE` e testes existentes de login/guard.
  - Construir `ProductsPage` (`apps/web/src/app/features/products/pages/products.page.*`) fiel ao protótipo `produtos.html` (usando tokens de design do `styles.css`, signals e `@if`/`@for`): título + botão **+ Novo Produto**, 2 cards de resumo (`Produtos ativos` e `Códigos de barras duplicados`), barra de busca local por nome ou código de barras, tabela de produtos com colunas `Código de barras`, `Produto`, `Preço unitário`, `Status` e `Ações` (botões Editar/Desativar desabilitados com `// TODO #14`), estado vazio, e modal **Cadastrar Novo Produto** com validação inline por campo, erro `409` destacando o campo de código de barras em `perigo`, tratamento de `401` (via `authInterceptor`), falha de rede e cancelamento/fechamento sem persistir.

## Tarefas

- [x] **Tarefa 1 — Implementar `POST /products` e liberar `GET /products` para gerente na API (unit + e2e)**
  - Cobre: CA1 (lado da API), CA2 (lado da API), CA3 (lado da API), CA4 (lado da API), CA5
  - Teste primeiro: testes unitários em `products.service.spec.ts` (criação com `active: true` e `trim()` no nome; conflito `409` com mensagem exata em código duplicado; listagem de ativos para operador e catálogo para gerente) e testes e2e em `apps/api/test/products.e2e-spec.ts` (`POST /products` retorna `201` para `MANAGER` e produto aparece em `GET /products` do `OPERATOR`; `409` em código duplicado; `400` para nome vazio, barcode fora de 13 dígitos, `priceCents <= 0` ou campo extra `active`; `403` para `OPERATOR` em `POST /products`; `401` sem token/token inválido em `POST` e `GET`; `200` em `GET /products` para `MANAGER` e `OPERATOR`); falham porque DTO, método `create` e rotas ainda não existem
  - Arquivos previstos: `apps/api/src/modules/products/dto/create-product.dto.ts`, `apps/api/src/modules/products/products.service.ts`, `apps/api/src/modules/products/products.service.spec.ts`, `apps/api/src/modules/products/products.controller.ts`, `apps/api/test/products.e2e-spec.ts`

- [ ] **Tarefa 2 — Criar `ProductsService`, atualizar `Header` para o layout do protótipo e configurar rota `/produtos` no frontend**
  - Cobre: CA4 (lado do front — menu por papel e proteção de rota), CA1 (camada de serviço)
  - Teste primeiro: testes unitários em `products.service.spec.ts` (`list()` faz `GET /products` e `create()` faz `POST /products` desembrulhando `{ data }`) e atualização de `header.spec.ts` (gerente vê **Produtos** e **Operadores**, nome/papel e botão **Sair**; operador vê **Caixa** e não vê **Produtos**); falham porque `ProductsService` não existe e o `Header` ainda não segue o layout do protótipo
  - Arquivos previstos: `apps/web/src/index.html`, `apps/web/src/app/features/products/data/products.service.ts`, `apps/web/src/app/features/products/data/products.service.spec.ts`, `apps/web/src/app/core/layout/header.ts`, `apps/web/src/app/core/layout/header.spec.ts`, `apps/web/src/app/app.routes.ts`

- [ ] **Tarefa 3 — Construir tela de Produtos (listagem, cards de resumo, busca local e estado vazio) fiel ao protótipo**
  - Cobre: CA1 (listagem e layout da tela), CA6 (estado vazio e busca sem resultados)
  - Teste primeiro: testes unitários em `products.page.spec.ts` verificando renderização da tabela de produtos com preço formatado em R$ e status `Disponível`, cards de resumo com contagem real, filtro local por nome e código de barras, estado vazio quando não há produtos ou quando a busca não encontra correspondência, e botões Editar/Desativar desabilitados (`// TODO #14`); falham porque `ProductsPage` é apenas um placeholder
  - Arquivos previstos: `apps/web/src/app/features/products/pages/products.page.ts`, `apps/web/src/app/features/products/pages/products.page.html`, `apps/web/src/app/features/products/pages/products.page.spec.ts`

- [ ] **Tarefa 4 — Implementar modal "+ Novo Produto" com validação inline, envio e cancelamento sem persistir**
  - Cobre: CA1 (cadastro pela interface), CA3 (validação no formulário), CA9 (abandono/cancelamento sem persistir)
  - Teste primeiro: testes unitários em `products.page.spec.ts` verificando abertura/fechamento do modal pelo botão `+ Novo Produto` e `Cancelar` sem chamar `ProductsService.create`, bloqueio de envio com mensagens de erro por campo (nome vazio, EAN-13 inválido, preço vazio/zero/negativo), e envio válido chamando `ProductsService.create` com `priceCents` correto, atualizando a tabela e fechando o modal; falham porque o modal ainda não existe
  - Arquivos previstos: `apps/web/src/app/features/products/pages/products.page.ts`, `apps/web/src/app/features/products/pages/products.page.html`, `apps/web/src/app/features/products/pages/products.page.spec.ts`

- [ ] **Tarefa 5 — Tratar conflito `409`, sessão expirada `401` e falha de rede na tela de Produtos**
  - Cobre: CA2 (lado do front), CA7, CA8
  - Teste primeiro: testes unitários em `products.page.spec.ts` verificando que `409` destaca o campo de código de barras com erro e exibe "Já existe um produto com este código de barras." mantendo os dados preenchidos, erro de rede exibe "Não foi possível conectar. Tente novamente." mantendo os campos e saindo do carregamento (tanto na listagem quanto no cadastro), e `401` dispara o fluxo do `authInterceptor` sem criar produto; falham porque esses tratamentos ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/products/pages/products.page.ts`, `apps/web/src/app/features/products/pages/products.page.html`, `apps/web/src/app/features/products/pages/products.page.spec.ts`

## Critérios sem tarefa
