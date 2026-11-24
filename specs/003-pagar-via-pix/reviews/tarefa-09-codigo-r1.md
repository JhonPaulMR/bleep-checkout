# Parecer de Código — Tarefa 9

**Veredito:** APONTAMENTOS

## Apontamentos (bloqueiam)

1. **Polling de confirmação de pagamento implementado no componente `CheckoutPage` em vez de `CheckoutService`** — `apps/web/src/app/features/checkout/pages/checkout.page.ts:397-426`
   - **Regra violada:** `docs/architecture.md` §4 ("A confirmação do PIX é acompanhada por polling do status da venda no service da feature `checkout`, até ela sair de `PENDING`.")
   - **Prejuízo concreto:** `CheckoutPage` (442 linhas) acumula orquestração RxJS de polling (`interval`, `switchMap`, `catchError` e gestão manual de `Subscription`) que pertence à camada de dados da feature. Quando a tela de Vendas Pendentes (US11) precisar acompanhar a confirmação de vendas PIX em `PENDING`, essa lógica estará presa ao componente e terá de ser duplicada ou extraída com refatoração.

2. **Race condition na montagem do Card Payment Brick antes da renderização do container no DOM e sem guarda contra troca de estado durante a montagem assíncrona** — `apps/web/src/app/features/checkout/pages/checkout.page.ts:279-347`
   - **Regra violada:** `docs/architecture.md` §2 (padrão Angular 22+ com signals e renderização reativa) / sustentabilidade e integridade de ciclo de vida com SDK externo.
   - **Prejuízo concreto:**
     - Em `proceedToPayment()` (a partir da 2ª venda, quando `cachedPublicKey` já está preenchido) e em `selectPaymentMethod('CARD')` (ao alternar de PIX para Cartão), `mountCardBrick()` invoca `bricksBuilder.create('cardPayment', 'card-payment-brick-container', ...)` sincronamente logo após `sale.set(...)` / `selectedMethod.set('CARD')`, **antes** do Angular renderizar `<div id="card-payment-brick-container">` no DOM (condicionado por `@if`). Em produção/sandbox com o SDK real do Mercado Pago, o elemento ainda não existe no DOM e a montagem falha (os testes não detectam porque `bricksBuilder.create` é mockado).
     - Além disso, o guarda da linha 303 não verifica `this.selectedMethod() !== 'CARD'`, nem revalida o estado após `await bricksBuilder.create(...)`. Se o operador trocar para PIX, iniciar nova venda ou sair da tela enquanto `getPaymentConfig()` ou `bricksBuilder.create()` estiver em andamento, o Brick pode tentar montar fora de contexto ou vazar a instância sem chamar `unmount()`.

## Sugestões (não bloqueiam)

- **Ícones nos selos de status da venda** (`apps/web/src/app/features/checkout/pages/checkout.page.html:114-138`): `docs/design-tokens.md` ("Estados da venda") especifica token da paleta **e** ícone + texto (carrinho para Aberta, relógio para Pendente, check para Concluída, X para Cancelada). O markup já usa `inline-flex items-center gap-xs`, mas está sem os ícones.
- **Estado `hover` nos botões secundários** (`apps/web/src/app/features/checkout/pages/checkout.page.html:60,69,189,214,261`): `docs/design-tokens.md` ("Botões — Estados") prevê estado `hover` para todas as variantes; os botões primários aplicam `hover:brightness-90`, enquanto os secundários não têm classe de hover.
- **Tratamento de rejeição no `navigator.clipboard.writeText`** (`apps/web/src/app/features/checkout/pages/checkout.page.ts:258-262`): adicionar `.catch(...)` para evitar *unhandled promise rejection* se o navegador negar acesso à área de transferência.
- **Cast de `email` em `SessionUser`** (`apps/web/src/app/features/checkout/pages/checkout.page.ts:392-395`): `SessionUser` em `apps/web/src/app/core/auth/auth.service.ts:5-8` só possui `name` e `role`, portanto `user?.email` será sempre `undefined` em runtime (enquanto `checkout.page.spec.ts:117` simula `email` no mock). Alinhar o tipo ou remover o cast morto evita falsa sensação de cobertura.
- **Helper compartilhado de mensagem de erro HTTP**: `extractErrorMessage` (`checkout.page.ts:433-441`) e `NETWORK_ERROR_MESSAGE` repetem padrão já presente em `operators.page.ts`; vale centralizar em `core/` quando houver mais telas.

## Observações fora do escopo deste diff

- `apps/web/src/app/shared/ui/` (previsto em `docs/architecture.md` §3 para o botão com os 5 estados e o selo de status da venda) ainda não foi criado; quando a tela de Vendas Pendentes (US11) entrar, vale abrir tarefa para extrair o selo de status da venda e o botão reutilizável para `shared/ui/`.
