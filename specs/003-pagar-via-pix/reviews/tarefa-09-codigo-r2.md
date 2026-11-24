<Parecer de Código — Tarefa 9>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. Todos os apontamentos e sugestões promovidas aceitos na rodada 1 (`specs/003-pagar-via-pix/reviews/tarefa-09-decisoes-r1.md`) foram resolvidos adequadamente:

1. **Polling movido para `CheckoutService`** — `apps/web/src/app/features/checkout/data/checkout.service.ts:117-131`
   `pollSaleUntilSettled(saleId, intervalMs = 3000)` encapsula `interval` + `switchMap` + `takeWhile`, tolerando erros transitórios e propagando `401`, com 3 testes dedicados em `checkout.service.spec.ts:213-301`. `CheckoutPage` apenas consome o observable e encerra a assinatura ao concluir ou destruir (`checkout.page.ts:458-479`).
2. **Montagem segura do Card Payment Brick** — `apps/web/src/app/features/checkout/pages/checkout.page.ts:294-413`
   `waitForBrickContainer()` aguarda `afterNextRender` caso o container ainda não esteja no DOM, e `isBrickMountStillValid(seq, saleId)` com contador `brickMountSeq` protege contra troca de método, nova venda ou destruição durante etapas assíncronas (chamando `createdBrick.unmount?.()` se o estado tiver mudado). Coberto em `checkout.page.spec.ts:384-427`.
3. **Sugestões promovidas na r1 atendidas**
   - Ícones SVG (`aria-hidden="true"`) adicionados aos 4 selos de status da venda em `checkout.page.html:114-194`, alinhados a `docs/design-tokens.md`.
   - Estado `hover:bg-fundo` aplicado a todos os botões secundários em `checkout.page.html:60,69,246,271,290,307,322`.
   - `.catch()` adicionado em `navigator.clipboard.writeText` (`checkout.page.ts:269-276`), com teste em `checkout.page.spec.ts:429-468`.
   - Cast morto de `email` em `SessionUser` e injeção desnecessária de `AuthService` removidos (`checkout.page.ts:24,356` e `checkout.page.spec.ts`).

## Sugestões (não bloqueiam)
- **Restaurar `navigator.clipboard` no teste de falha de cópia** (`apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:450-453`): salvar o descriptor original de `navigator.clipboard` e restaurá-lo após o teste (ou no `afterEach`) evita que o mock vaze para testes futuros que venham a usar a área de transferência.
- **Helper compartilhado de mensagem de erro HTTP**: `extractErrorMessage` (`checkout.page.ts:488-496`) e `NETWORK_ERROR_MESSAGE` repetem padrão já existente em `operators.page.ts`; vale centralizar em `core/` quando novas telas forem adicionadas.

## Observações fora do escopo deste diff
- `apps/web/src/app/shared/ui/` (previsto em `docs/architecture.md` §3 para o botão com os 5 estados e o selo de status da venda) ainda não foi criado; quando a tela de Vendas Pendentes (US11) entrar, vale abrir tarefa para extrair o selo de status da venda e o botão reutilizável para `shared/ui/`.
