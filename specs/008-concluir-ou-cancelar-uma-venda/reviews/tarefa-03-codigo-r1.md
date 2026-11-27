<Parecer de Código — Tarefa 3>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O diff respeita integralmente as regras de `docs/architecture.md`:
- **Camadas e fronteira de dados (§4):** `CheckoutPage` consome exclusivamente `CheckoutService.cancelSale(currentSale.id)`, sem acoplamento a `HttpClient`, URLs ou envelope `{ data }`.
- **Padrões Angular (§2):** signals e `computed()` para o estado de cancelamento e resumo (`cancelConfirmMode`, `cancelingSale`, `cancelError`, `completedPaymentMethodLabel`, `completedSaleItems`), controle de fluxo `@if`/`@else if`/`@for` com `track item.id`, sem diretivas legadas.
- **Design tokens (§2):** todas as classes de cor, espaçamento e tipografia no diff usam os tokens semânticos de `docs/design-tokens.md` (`perigo`, `sucesso`, `primaria`, `fundo`, `superficie`, `desabilitado`, `texto`, `texto-suave`), sem valores hex soltos.
- **Tratamento de erro e concorrência:** erros de cancelamento são exibidos no modal com `role="alert"` (delegando `401` ao `authInterceptor`, coerente com o restante da página), duplo clique é bloqueado por `cancelingSale()`, e o polling fecha o modal caso a venda transite para `COMPLETED` ou `CANCELED` enquanto a confirmação está aberta.
- **Testes e lint:** `cd apps/web; npm test` (16 arquivos, 170 testes passando) e `cd apps/web; npm run lint` (sem erros) validados; os testes adicionados verificam comportamento pelo DOM e mockam apenas a fronteira do service.

## Sugestões (não bloqueiam)
- **Reaproveitar `PAYMENT_METHOD_LABELS` em `selectedExternalMethodLabel`** (`apps/web/src/app/features/checkout/pages/checkout.page.ts:219-221`): agora que `PAYMENT_METHOD_LABELS` cobre todos os valores de `PaymentMethod`, `selectedExternalMethodLabel` pode usar `PAYMENT_METHOD_LABELS[this.selectedExternalMethod()]` para manter uma única fonte de rótulos no arquivo.
- **Extrair helper privado `resetCartState()`** (`apps/web/src/app/features/checkout/pages/checkout.page.ts:733-743` e `785-802`): `confirmCancel()` no modo `'CART'` repete o bloco de reset de signals do carrinho já presente em `startNewSale()`; um helper privado reduz o risco de esquecer um signal caso o carrinho ganhe novos estados.
- **Desmembrar o teste multi-cenário de `US08 CA1`** (`apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1923-2064`): o segundo `it` testa PIX, Crédito do cliente, Crédito externo e Débito externo no mesmo bloco chamando `TestBed.resetTestingModule()` manualmente no meio. Separar em `it` distintos (ou `it.each`) melhora o isolamento e o diagnóstico em caso de falha.
- **Listener `keydown.escape` redundante no modal** (`apps/web/src/app/features/checkout/pages/checkout.page.html:1260`): o `onWindowKeydown` já intercepta `Escape` globalmente quando `cancelConfirmMode() !== null`; o `(keydown.escape)` no `<div>` do modal é inofensivo por `closeCancelConfirm()` ser idempotente, mas pode ser removido para evitar duplicidade.

## Observações fora do escopo deste diff
- **Tamanho e coesão da `CheckoutPage`** (`apps/web/src/app/features/checkout/pages/checkout.page.ts` com ~1.012 linhas e `checkout.page.html` com ~1.320 linhas): a página acumulou múltiplas responsabilidades ao longo das US03–US08 (carrinho, modais de busca/cliente/cancelamento, fluxo de pagamento e resumo). Candidata a Issue de manutenção para extrair subcomponentes presentacionais (`input()`/`output()`) em `apps/web/src/app/features/checkout/components/`, conforme previsto na estrutura do `docs/architecture.md` §3 e §4.
</Parecer de Código — Tarefa 3>
