# Parecer de Código — Tarefa 2

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O código respeita integralmente as camadas e padrões do `docs/architecture.md` (Angular 22+ standalone sem `standalone: true`, `inject()`, signals/`computed()`, `@if`/`@for`, lazy loading por rota, `canMatch` com `roleGuard`, serviço de dados em `features/products/data/products.service.ts` injetando `API_URL` e desembrulhando `{ data }`) e utiliza apenas tokens semânticos do `docs/design-tokens.md` no `Header`, sem segredos ou URLs de ambiente hardcoded e com testes orientados a comportamento.

## Sugestões (não bloqueiam)
- **Rota `/cadastros` como redirecionamento para `/produtos`** — `apps/web/src/app/app.routes.ts:10-20`: hoje `/cadastros` e `/produtos` carregam `ProductsPage` separadamente. Como `AREA_BY_ROLE.MANAGER` em `core/auth/role.guard.ts` ainda aponta para `/cadastros`, ao fazer login o gerente cai em `/cadastros` e a aba **Produtos** no `Header` (`routerLink="/produtos"` com `routerLinkActive`) não fica marcada como ativa até o usuário clicar nela. Trocar a rota `/cadastros` para `{ path: 'cadastros', canMatch: [roleGuard('MANAGER')], redirectTo: 'produtos', pathMatch: 'full' }` mantém compatibilidade com os testes existentes de `LoginPage`/`roleGuard` e garante que o item ativo do cabeçalho fique sempre sincronizado.
- **Consistência de visibilidade e promise no `Header.logout()`** — `apps/web/src/app/core/layout/header.ts:217-220`: usar `protected logout()` (alinhado aos demais membros usados apenas no template) e `void this.router.navigateByUrl('/login')` (alinhado ao padrão já usado em `LoginPage`).

## Observações fora do escopo deste diff
- **Duplicação da interface `Product` e de `GET /products` entre features** — `apps/web/src/app/features/checkout/data/checkout.service.ts:26-33,98-102` já define `Product` (com os mesmos campos) e `listProducts()`. Como o `architecture.md` (§4) proíbe importação direta entre features ("o que for comum sobe para `shared/` ou `core/`"), manter a definição local em `products.service.ts` preservou a fronteira agora; se o contrato de `Product` crescer (ex.: na US13), vale abrir uma tarefa de manutenção para subir o tipo `Product` para `shared/`.
- **Rota padrão do gerente em `AREA_BY_ROLE`** — `apps/web/src/app/core/auth/role.guard.ts:5-8` ainda usa `MANAGER: '/cadastros'` (coberto por `role.guard.spec.ts` e `login.page.spec.ts`). Quando a migração de nomenclatura para `/produtos` for consolidada, vale atualizar `AREA_BY_ROLE` e os respectivos testes.
