# Plano — Issue #8

## Decisões técnicas

- **API — Máquina de estados (`apps/api/src/modules/payments/payment-state-machine.ts`):**
  - Permitir `SaleStatus.CANCELED` como destino válido a partir de `SaleStatus.OPEN` e `SaleStatus.PENDING` em `SALE_TRANSITIONS` (`OPEN → COMPLETED | PENDING | CANCELED`, `PENDING → COMPLETED | OPEN | CANCELED`), mantendo `COMPLETED → ∅` e `CANCELED → ∅` (RN18).
  - `PAYMENT_TRANSITIONS` já permite `PENDING → ABANDONED` e bloqueia qualquer saída de `ABANDONED`, `APPROVED` ou `DECLINED`, impedindo que um webhook PIX atrasado conclua uma venda já cancelada.
- **API — Vendas (`apps/api/src/modules/sales/`):**
  - Novo endpoint `POST /sales/:id/cancel` em `SalesController` com `@Roles(Role.OPERATOR)` e documentação Swagger (`201`, `401`, `403`, `404`, `422`).
  - Novo método `SalesService.cancel(id: string, requesterId: string)`:
    1. Busca a venda via `prisma.sale.findUnique({ where: { id } })`: se não existir → `NotFoundException('Venda não encontrada.')` (`404`); se `sale.operatorId !== requesterId` → `ForbiddenException('Você não tem permissão para cancelar esta venda.')` (`403`).
    2. Valida o estado atual: se `sale.status === SaleStatus.COMPLETED` → `UnprocessableEntityException('Uma venda concluída não pode ser cancelada.')` (`422`, RN18); se `sale.status === SaleStatus.CANCELED` → `UnprocessableEntityException('A venda já está cancelada.')` (`422`).
    3. Confere `canTransitionSale(sale.status, SaleStatus.CANCELED)` e, dentro de `prisma.$transaction`:
       - Executa atualização condicional `tx.sale.updateMany({ where: { id: sale.id, status: { in: [SaleStatus.OPEN, SaleStatus.PENDING] } }, data: { status: SaleStatus.CANCELED } })`. Se `count === 0` (corrida com conclusão ou cancelamento simultâneo), reconsulta o status atual e lança `UnprocessableEntityException` com a mensagem correspondente (`COMPLETED` → `'Uma venda concluída não pode ser cancelada.'`, `CANCELED` → `'A venda já está cancelada.'`).
       - Marca pagamentos pendentes da venda como abandonados via `tx.payment.updateMany({ where: { saleId: sale.id, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.ABANDONED } })`.
       - Retorna a venda atualizada via `tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: SALE_DETAILS_INCLUDE })`.
- **Frontend (`apps/web/src/app/features/checkout/`):**
  - `CheckoutService`:
    - Novo método `cancelSale(saleId: string): Observable<Sale>` chamando `POST ${this.apiUrl}/sales/${encodeURIComponent(saleId)}/cancel` com corpo `{}` e desembrulhando `{ data }`.
  - `CheckoutPage`:
    - **Tela de venda concluída (`COMPLETED`, CA1):** exibe resumo completo da venda concluída contendo tabela/lista dos itens (`sale.items`, com nome do produto, quantidade e subtotal `unitPriceCents * quantity`), total (`sale.totalCents`) e forma de pagamento confirmada para todas as 5 modalidades (`Cartão de crédito`, `PIX`, `Crédito do cliente`, `Crédito externo`, `Débito externo`), sem oferecer ação de cancelamento. Quando `sale.items` não vier preenchido na resposta parcial de pagamento, usa os itens do carrinho atual como fallback de exibição.
    - **Tela de venda `OPEN` / `PENDING` (CA2, CA3, CA7):** garante ausência de qualquer ação que conclua sem pagamento confirmado; adiciona botão **Cancelar venda** que abre um bloco/modal de confirmação explícita (**Confirmar cancelamento** / **Voltar**, com suporte a `Esc`). Ao confirmar, chama `checkoutService.cancelSale(sale.id)` com botões desabilitados em estado de carregamento (`cancelingSale()`), encerra polling e desmonta Card Brick em caso de sucesso, atualiza `sale` para `CANCELED` exibindo o estado **Cancelada — nenhum valor recebido** e o botão **Nova venda**. Em erro de rede ou `422`, exibe mensagem clara e mantém o estado atual.
    - **Carrinho no simulador de caixa (CA6):** substitui o `TODO #8` pelo botão **Cancelar venda [F8]** (desabilitado quando `cart().length === 0`) e atalho de teclado `F8` (quando `!sale()` e sem modais abertos e `cart().length > 0`), abrindo confirmação explícita (**Confirmar cancelamento** / **Voltar** ou `Esc`) que limpa carrinho, quantidade, erros e cliente selecionado ao confirmar.

## Tarefas

- [x] **Tarefa 1 — Implementar `POST /sales/:id/cancel` com transação atômica e transições `OPEN/PENDING → CANCELED` na API (unit + e2e)**
  - Cobre: CA3 (lado da API — `OPEN`/`PENDING` → `CANCELED` com `completedAt` nulo e `Payment` `PENDING` → `ABANDONED` em transação atômica), CA4 (`422` para `COMPLETED` e `CANCELED`, além de proteção contra webhook PIX atrasado após cancelamento), CA5 (`403` para `MANAGER` ou outro `OPERATOR` e `404` para venda inexistente)
  - Teste primeiro: testes unitários em `sales.service.spec.ts` (cancelamento de `OPEN`, cancelamento de `PENDING` abandonando `Payment` `PENDING`, `404`, `403`, `422` em `COMPLETED`/`CANCELED` e corrida `updateMany.count === 0`) e testes e2e em `apps/api/test/sales.e2e-spec.ts` contra PostgreSQL real cobrindo `201` para `OPEN` e `PENDING`, `401`, `403` (`MANAGER` e outro `OPERATOR`), `404` e `422` (`COMPLETED` e `CANCELED`, mais garantia de que webhook/pagamento posterior não conclui venda cancelada); falham porque `POST /sales/:id/cancel` e `SalesService.cancel` ainda não existem
  - Arquivos previstos: `apps/api/src/modules/payments/payment-state-machine.ts`, `apps/api/src/modules/payments/payment-state-machine.spec.ts`, `apps/api/src/modules/sales/sales.controller.ts`, `apps/api/src/modules/sales/sales.service.ts`, `apps/api/src/modules/sales/sales.service.spec.ts`, `apps/api/test/sales.e2e-spec.ts`

- [ ] **Tarefa 2 — Adicionar `cancelSale()` ao `CheckoutService`**
  - Cobre: CA3 (chamada HTTP `POST /sales/:id/cancel` com `encodeURIComponent` desembrulhando `{ data }`)
  - Teste primeiro: teste unitário em `checkout.service.spec.ts` verificando `cancelSale(saleId)` enviando `POST /sales/:id/cancel` com `saleId` codificado e retornando `Sale` com status `CANCELED`; falha porque `cancelSale` ainda não existe
  - Arquivos previstos: `apps/web/src/app/features/checkout/data/checkout.service.ts`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts`

- [ ] **Tarefa 3 — Implementar resumo de venda concluída (`COMPLETED`) e cancelamento com confirmação (`[F8]` no carrinho e `OPEN`/`PENDING` no pagamento) na `CheckoutPage`**
  - Cobre: CA1 (resumo completo na tela `COMPLETED` com itens, quantidades, subtotais, total e forma de pagamento confirmada para todas as 5 modalidades, sem botão de cancelamento), CA2 (telas `OPEN` e `PENDING` não oferecem atalho para concluir sem pagamento confirmado), CA3 (botão **Cancelar venda** + confirmação explícita em `OPEN`/`PENDING`, encerrando polling, exibindo **Cancelada — nenhum valor recebido** e **Nova venda**), CA6 (botão **Cancelar venda [F8]** e atalho `F8` no carrinho com confirmação explícita, `Voltar`/`Esc` mantendo carrinho e botão desabilitado se carrinho vazio), CA7 (desistência por **Voltar**/`Esc` sem chamar API, desabilitação em carregamento durante cancelamento e erro de rede mantendo estado atual)
  - Teste primeiro: testes em `checkout.page.spec.ts` cobrindo resumo de venda `COMPLETED` (itens, quantidades, subtotais, total e rótulo da forma de pagamento confirmada sem botão de cancelar), ausência de ação para concluir sem pagamento em `OPEN`/`PENDING`, cancelamento confirmado em `OPEN` e em `PENDING` (encerrando polling e exibindo **Cancelada — nenhum valor recebido**), botão `[F8]` e atalho `F8` no carrinho com confirmação/desistência e estado desabilitado quando vazio, desistência por `Voltar`/`Esc` no pagamento sem disparar `cancelSale`, botões desabilitados durante carregamento e tratamento de erro de rede; falham porque essas funcionalidades ainda não existem na `CheckoutPage`
  - Arquivos previstos: `apps/web/src/app/features/checkout/pages/checkout.page.ts`, `apps/web/src/app/features/checkout/pages/checkout.page.html`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts`

## Critérios sem tarefa

*(nenhum)*
