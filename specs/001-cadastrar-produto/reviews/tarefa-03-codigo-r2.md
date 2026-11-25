# Parecer de Código — Tarefa 3

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O apontamento da rodada 1 (erro silencioso na listagem de produtos em `apps/web/src/app/features/products/pages/products.page.ts`) foi corrigido: `listError` agora registra a falha de `GET /products`, o template exibe `<p role="alert">` no branch dedicado sem cair no estado vazio do catálogo, e há teste unitário cobrindo o cenário em `apps/web/src/app/features/products/pages/products.page.spec.ts`.

O código respeita `docs/architecture.md` e `docs/design-tokens.md`: componente standalone sem `standalone: true`, `inject()`, signals (`signal`/`computed`), controle de fluxo `@if`/`@for`, acesso à API isolado em `ProductsService` e uso exclusivo dos tokens semânticos de cor, espaçamento e tipografia.

## Sugestões (não bloqueiam)
- **Subir formatação de centavos para BRL para `shared/`:** `apps/web/src/app/features/products/pages/products.page.ts:5-8,60-62` repete a formatação `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` já presente em `apps/web/src/app/features/checkout/pages/checkout.page.ts`. Conforme `docs/architecture.md` §4 (*"Uma feature não importa de outra; o que for comum sobe para `shared/` ou `core/`"*), extrair um utilitário ou pipe em `apps/web/src/app/shared/` evita repetir essa conversão nas próximas features.
- **Desacoplar seletor do campo de busca do texto de `placeholder` nos testes:** Em `apps/web/src/app/features/products/pages/products.page.spec.ts:94` e `135`, o input é selecionado por `input[placeholder="Buscar por código ou nome..."]`. Preferir `input[name="searchTerm"]` ou `data-testid` evita que ajustes de texto quebrem o teste.

## Observações fora do escopo deste diff
- `apps/web/src/app/features/checkout/pages/checkout.page.ts:158-163`: `formatCents` instancia `new Intl.NumberFormat(...)` a cada chamada, enquanto `ProductsPage` já reutiliza `BRL_FORMATTER` no escopo do módulo. Boa candidata a Issue de manutenção para unificar a formatação monetária em `apps/web/src/app/shared/`.
