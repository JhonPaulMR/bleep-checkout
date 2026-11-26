# Plano — Issue #4

## Decisões técnicas

- **API (`apps/api/src/modules/products/`):**
  - `GET /products/barcode/:barcode` — `@Roles(Role.OPERATOR)`, delega para `ProductsService.findActiveByBarcode(barcode)`. Consulta `prisma.product.findFirst({ where: { barcode: trimmed, active: true } })`; se não encontrar (inexistente ou desativado), lança `NotFoundException('Produto não localizado.')` (`404`). Retorna `200` com `{ data: product }`.
  - `GET /products?search=<termo>` — mantém `@Roles(Role.MANAGER, Role.OPERATOR)`, aceita `@Query('search') search?: string` opcional. Quando `search?.trim()` estiver preenchido, filtra `name: { contains: term, mode: 'insensitive' }` (mantendo `active: true` para `OPERATOR` e catálogo para `MANAGER`). Remove os comentários `TODO #4` em `products.controller.ts` e `products.service.ts`.
  - Swagger atualizado com `@ApiQuery({ name: 'search', required: false })`, `@ApiParam({ name: 'barcode' })` e `@ApiResponse` (`200`, `401`, `403`, `404`).
- **Frontend (`apps/web/src/app/features/checkout/`):**
  - `CheckoutService`: adiciona `findProductByBarcode(barcode: string): Observable<Product>` (`GET /products/barcode/${encodeURIComponent(barcode)}`) e `searchProducts(term: string): Observable<Product[]>` (`GET /products?search=${encodeURIComponent(term)}`), desembrulhando `{ data }`.
  - `CheckoutPage`: substitui a montagem simplificada (`TODO #4`) pelo PDV fiel a `caixa.html` + `busca.html` (usando apenas tokens semânticos de `styles.css`, signals e `@if`/`@for`):
    - Barra do terminal (`Terminal 01 · Operador: <nome>` + badges `API conectada` e `Leitor USB pronto`).
    - Card **Entrada de Produtos**: campo `Código de barras (EAN-13)` (`F4`, `keydown.enter` para leitor USB, botão `Adicionar`), botão `Buscar por nome`, alerta `perigo` para `404` (`"Produto não localizado."`) e falha de rede (`"Não foi possível conectar. Tente novamente."`).
    - Tabela **Produtos no Carrinho**: `#`, `Código EAN`, `Produto`, `Qtd`, `Preço unit.`, `Subtotal`, remoção individual de item e `Limpar lista`.
    - Painel **Resumo da Venda**: total de unidades, subtotal, destaque `TOTAL A PAGAR` e botão **Prosseguir para pagamento `[F9]`**, preservando integralmente toda a etapa de pagamento Cartão + PIX da US06.
    - Modal **Buscar produto por nome** (`busca.html`): campo de pesquisa chamando `searchProducts(term)`, lista de resultados com botão `Adicionar`, estado vazio `"Nenhum produto encontrado."`, `Esc` / botão fechar sem alterar o carrinho.
    - Marcações `// TODO #5` (quantidade prévia), `// TODO #7` (identificação de cliente) e `// TODO #8` (cancelamento formal de venda) nos pontos declarados em `Assume que`.

## Tarefas

- [x] **Tarefa 1 — Implementar `GET /products/barcode/:barcode` e filtro `?search=` em `GET /products` na API (unit + e2e)**
  - Cobre: CA1 (lado da API), CA3 (lado da API), CA4 (lado da API — `404`), CA5 (lado da API — lista vazia), CA7 (`401`/`403` e escopo por papel)
  - Teste primeiro: testes unitários em `products.service.spec.ts` (`findActiveByBarcode` retorna produto ativo e lança `NotFoundException('Produto não localizado.')` se ausente/inativo; `listForRole` aplica filtro `contains` case-insensitive quando `search` é informado) e testes e2e em `apps/api/test/products.e2e-spec.ts` (`GET /products/barcode/:barcode` `200` para produto ativo, `404` para inexistente e desativado, `403` para `MANAGER`, `401` sem token; `GET /products?search=` filtra case-insensitive apenas ativos para `OPERATOR` e retorna lista vazia quando não encontra); falham porque o endpoint e o filtro ainda não existem
  - Arquivos previstos: `apps/api/src/modules/products/products.service.ts`, `apps/api/src/modules/products/products.service.spec.ts`, `apps/api/src/modules/products/products.controller.ts`, `apps/api/test/products.e2e-spec.ts`

- [ ] **Tarefa 2 — Adicionar `findProductByBarcode()` e `searchProducts()` em `CheckoutService` no frontend**
  - Cobre: CA1 (serviço de busca por código), CA3 (serviço de busca por nome)
  - Teste primeiro: testes unitários em `checkout.service.spec.ts` verificando `findProductByBarcode('7891000120140')` fazendo `GET /products/barcode/7891000120140` e `searchProducts('café')` fazendo `GET /products?search=caf%C3%A9`, ambos desembrulhando `{ data }`; falham porque os métodos ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/checkout/data/checkout.service.ts`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts`

- [ ] **Tarefa 3 — Reformular montagem de venda na `CheckoutPage` fiel ao protótipo `caixa.html` (EAN, leitor USB, tabela do carrinho e resumo)**
  - Cobre: CA1 (entrada por código + botão Adicionar), CA2 (leitor USB via Enter), CA4 (alerta `Produto não localizado.` em `404` sem alterar carrinho), CA6 (layout PDV fiel a `caixa.html` preservando pagamento US06), CA9 (limpar carrinho sem criar venda)
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo entrada por código de barras + clique em `Adicionar` somando item (e somando `+1` ao bipar o mesmo produto novamente), entrada via `Enter` (leitor USB) limpando campo, erro `404` exibindo `"Produto não localizado."` sem alterar o carrinho, remoção de item e `Limpar lista`, além de preservar todos os testes do fluxo de pagamento Cartão/PIX da US06; falham porque a página ainda usa a lista provisória da US06
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

- [ ] **Tarefa 4 — Implementar modal "Buscar produto por nome" fiel a `busca.html` e tratar `401` e falha de rede na `CheckoutPage`**
  - Cobre: CA3 (modal de busca por nome selecionando item para o carrinho), CA5 (`Nenhum produto encontrado.` sem alterar carrinho), CA8 (`401` via `authInterceptor` e falha de rede exibindo `"Não foi possível conectar. Tente novamente."`), CA9 (fechar modal / `Esc` sem selecionar produto)
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo abertura/fechamento (`Esc` e botão fechar) do modal sem alterar o carrinho, busca por nome chamando `searchProducts(term)` e exibindo resultados com seleção adicionando ao carrinho, estado vazio `"Nenhum produto encontrado."`, erro de rede na busca por código e por nome exibindo `"Não foi possível conectar. Tente novamente."`, e teste integrado de `401` com `authInterceptor` levando ao `/login`; falham porque o modal e esses tratamentos ainda não existem
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

## Critérios sem tarefa
