<Parecer de Código — Tarefa 4>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O diff respeita integralmente o `docs/architecture.md`:
- **Camadas (§4):** `CheckoutPage` acessa a API exclusivamente via `CheckoutService` (`getSale`, `reopenSale`, `pollSaleUntilSettled`), sem `HttpClient` direto e sem import cruzado entre features.
- **Padrões Angular 22+ e Estilo (§2):** usa `inject()`, `signal()`/`computed()`, controle de fluxo `@if`/`@else if` e tokens semânticos de `design-tokens.md` (sem valores hex soltos).
- **Tratamento de erro e resiliência:** erros de rede/API em `loadSaleById` e `confirmReopen` são exibidos ao operador (`role="alert"`) com possibilidade de retentativa; `401` é delegado ao `authInterceptor` global (§4 ID16); transição concorrente via polling fecha o modal de confirmação de troca automaticamente.
- **Testes e Lint:** `cd apps/web; npm test` (18 arquivos / 191 testes passando) e `cd apps/web; npm run lint` (`All files pass linting.`) verdes, com testes focados em comportamento visível e contrato do serviço, sem acoplamento a internals.

## Sugestões (não bloqueiam)
- **Proteger `loadSaleById` contra componente destruído** (`apps/web/src/app/features/checkout/pages/checkout.page.ts:899-917`): usar `takeUntilDestroyed(this.destroyRef)` (ou checar `if (this.destroyed) return;` no `next`) evita que uma resposta tardia de `getSale` chame `restoreLoadedSale` → `startPolling` após o `destroyRef.onDestroy` já ter sido executado, o que deixaria um polling ativo fora da tela.
- **Limpar `?saleId=` da URL ao voltar ao caixa** (`apps/web/src/app/features/checkout/pages/checkout.page.ts:870-897`): em `startNewSale()`, navegar com `queryParams: { saleId: null }` e `replaceUrl: true` (quando houver `Router` disponível) evitaria que um F5 posterior recarregasse a venda anterior.
- **Tipagem de `providers` no spec** (`apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:216,251`): tipar `providers` como `Provider[]` (de `@angular/core`) em vez de `unknown[]` com cast `as never[]`.

## Observações fora do escopo deste diff
- **Crescimento de `CheckoutPage` (candidata a Issue de manutenção):** `apps/web/src/app/features/checkout/pages/checkout.page.ts` (~1.173 linhas) e `checkout.page.html` (~1.425 linhas) acumulam simulador de caixa, modais de busca/cliente, fluxos de pagamento e modais de confirmação. Vale abrir uma Issue de manutenção futura para extrair os modais e painéis de pagamento em subcomponentes de apresentação (`input()`/`output()`) sob `apps/web/src/app/features/checkout/components/`, conforme `docs/architecture.md` §3 e §4.
</Parecer de Código — Tarefa 4>
